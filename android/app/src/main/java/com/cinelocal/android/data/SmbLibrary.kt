package com.cinelocal.android.data

import android.net.Uri
import com.cinelocal.android.core.FsEntry
import com.cinelocal.android.core.LibraryFs
import com.hierynomus.msfscc.FileAttributes
import com.hierynomus.mssmb2.SMBApiException
import com.hierynomus.protocol.commons.EnumWithValue
import com.hierynomus.security.bc.BCSecurityProvider
import com.hierynomus.smbj.SMBClient
import com.hierynomus.smbj.SmbConfig
import com.hierynomus.smbj.auth.AuthenticationContext
import com.hierynomus.smbj.share.DiskShare
import java.io.IOException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

/** Carpeta de red: \\EQUIPO\Compartida\subcarpeta  o  smb://equipo/compartida/subcarpeta */
data class SmbLocation(val host: String, val share: String, val subPath: String) {
    companion object {
        fun parse(input: String): SmbLocation? {
            val parts = input.trim()
                .replace('\\', '/')
                .replaceFirst(Regex("^smb:", RegexOption.IGNORE_CASE), "")
                .split('/')
                .filter { it.isNotBlank() }
            if (parts.size < 2) return null
            return SmbLocation(parts[0], parts[1], parts.drop(2).joinToString("/"))
        }
    }
}

data class SmbCredentials(val user: String, val password: String) {
    /** "EQUIPO\usuario" o "usuario"; sin usuario se entra como invitado */
    fun toAuth(): AuthenticationContext {
        if (user.isBlank()) return AuthenticationContext.guest()
        val domain = user.substringBefore('\\', "").ifEmpty { null }
        val name = user.substringAfter('\\')
        return AuthenticationContext(name, password.toCharArray(), domain)
    }
}

/** Lectura de la biblioteca en una carpeta compartida de Windows (SMB 2/3) */
class SmbLibrary(private val location: SmbLocation, private val credentials: SmbCredentials) {

    private val client = SMBClient(
        SmbConfig.builder()
            // Android no trae MD4 (necesario para NTLM): se usa la implementación de BouncyCastle
            .withSecurityProvider(BCSecurityProvider())
            .withTimeout(30, TimeUnit.SECONDS)
            .withSoTimeout(30, TimeUnit.SECONDS)
            .build()
    )

    /** Abre la conexión, ejecuta [block] con acceso a la biblioteca y la cierra */
    fun <T> use(block: (LibraryFs) -> T): T {
        try {
            client.connect(location.host).use { conn ->
                val session = conn.authenticate(credentials.toAuth())
                (session.connectShare(location.share) as DiskShare).use { share ->
                    val root = location.subPath.replace('/', '\\')
                    if (root.isNotEmpty() && !share.folderExists(root)) {
                        throw IOException("No existe la carpeta \"${location.subPath}\" dentro de \"${location.share}\"")
                    }
                    return block(LibraryFs { rel -> list(share, join(root, rel)) })
                }
            }
        } catch (e: UnknownHostException) {
            throw IOException("No se encuentra el equipo \"${location.host}\" en la red. Prueba con su IP (p. ej. \\\\192.168.1.20\\${location.share}).")
        } catch (e: SMBApiException) {
            throw IOException(explain(e), e)
        } finally {
            client.close()
        }
    }

    private fun join(root: String, rel: String): String {
        val r = rel.replace('/', '\\')
        return when {
            root.isEmpty() -> r
            r.isEmpty() -> root
            else -> "$root\\$r"
        }
    }

    private fun list(share: DiskShare, path: String): List<FsEntry> =
        share.list(path).filter { it.fileName != "." && it.fileName != ".." }.map {
            FsEntry(
                name = it.fileName,
                isDir = EnumWithValue.EnumUtils.isSet(it.fileAttributes, FileAttributes.FILE_ATTRIBUTE_DIRECTORY),
                size = it.endOfFile,
                created = it.creationTime.toEpochMillis(),
                modified = it.lastWriteTime.toEpochMillis()
            )
        }

    private fun explain(e: SMBApiException): String {
        val status = e.status.name
        return when {
            status.contains("LOGON_FAILURE") || status.contains("ACCESS_DENIED") ->
                "Usuario o contraseña incorrectos, o sin permiso para entrar en \"${location.share}\""
            status.contains("BAD_NETWORK_NAME") -> "El equipo no comparte ninguna carpeta llamada \"${location.share}\""
            status.contains("ACCOUNT") -> "La cuenta de Windows no puede entrar por red ($status)"
            else -> "Error de red: $status"
        }
    }

    companion object {
        /**
         * Dirección para LibVLC: smb://usuario:contraseña@equipo/compartida/ruta.
         * Las credenciales van en la propia URL, que es lo que entiende el módulo SMB2 de VLC.
         */
        fun playbackUri(location: SmbLocation, credentials: SmbCredentials, relPath: String): Uri {
            val auth = if (credentials.user.isBlank()) "" else {
                val user = credentials.user.replace('\\', ';')   // DOMINIO;usuario
                Uri.encode(user, ";") + ":" + Uri.encode(credentials.password) + "@"
            }
            val segments = (listOf(location.share) + location.subPath.split('/') + relPath.split('/'))
                .filter { it.isNotEmpty() }
                .joinToString("/") { Uri.encode(it) }
            return Uri.parse("smb://$auth${location.host}/$segments")
        }
    }
}
