package com.cinelocal.android.data

import android.net.Uri
import com.cinelocal.android.core.FsEntry
import com.cinelocal.android.core.LibraryFs
import com.hierynomus.msdtyp.AccessMask
import com.hierynomus.msfscc.FileAttributes
import com.hierynomus.msfscc.fileinformation.FileStandardInformation
import com.hierynomus.mssmb2.SMB2CreateDisposition
import com.hierynomus.mssmb2.SMB2ShareAccess
import com.hierynomus.mssmb2.SMBApiException
import com.hierynomus.protocol.commons.EnumWithValue
import com.hierynomus.security.bc.BCSecurityProvider
import com.hierynomus.smbj.SMBClient
import com.hierynomus.smbj.SmbConfig
import com.hierynomus.smbj.auth.AuthenticationContext
import com.hierynomus.smbj.share.DiskShare
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.UnknownHostException
import java.util.EnumSet
import java.util.concurrent.TimeUnit

/**
 * Carpeta de red: \\EQUIPO\Compartida\subcarpeta  o  smb://equipo/compartida/subcarpeta.
 * Admite un puerto distinto del 445: \\EQUIPO:4445\Compartida  o  smb://equipo:4445/compartida.
 */
data class SmbLocation(val host: String, val share: String, val subPath: String, val port: Int? = null) {
    /** "equipo" o "equipo:4445", como va en una URL */
    val authority get() = if (port != null) "$host:$port" else host

    companion object {
        private val HOST_PORT = Regex("^([^:]+):(\\d{1,5})$")

        fun parse(input: String): SmbLocation? {
            val parts = input.trim()
                .replace('\\', '/')
                .replaceFirst(Regex("^smb:", RegexOption.IGNORE_CASE), "")
                .split('/')
                .filter { it.isNotBlank() }
            if (parts.size < 2) return null
            val hp = HOST_PORT.find(parts[0]) ?: return SmbLocation(parts[0], parts[1], parts.drop(2).joinToString("/"))
            val port = hp.groupValues[2].toInt().takeIf { it in 1..65535 } ?: return null
            return SmbLocation(hp.groupValues[1], parts[1], parts.drop(2).joinToString("/"), port)
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
            connect().forceClosing { conn ->
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

    private fun connect() = if (location.port != null) client.connect(location.host, location.port) else client.connect(location.host)

    /**
     * Copia [relPath] (relativa a la biblioteca) al final de [dest] desde el byte [offset]: así se reanuda un .part.
     * [onChunk] recibe los bytes escritos en total y devuelve false para parar (pausa o cancelación).
     * Devuelve el tamaño del archivo en el PC si se copió entero, o null si se paró.
     * Se lee justo hasta ese tamaño: algunos servidores no contestan a una lectura más allá del final.
     */
    fun download(relPath: String, dest: File, offset: Long, onChunk: (Long) -> Boolean): Long? {
        try {
            connect().forceClosing { conn ->
                val session = conn.authenticate(credentials.toAuth())
                (session.connectShare(location.share) as DiskShare).use { share ->
                    val path = join(location.subPath.replace('/', '\\'), relPath)
                    share.openFile(path, EnumSet.of(AccessMask.GENERIC_READ), null, SMB2ShareAccess.ALL, SMB2CreateDisposition.FILE_OPEN, null).use { file ->
                        val size = file.getFileInformation(FileStandardInformation::class.java).endOfFile
                        if (offset >= size) return size.also { if (offset > size) throw IOException("El archivo del PC ha cambiado") }
                        // lecturas una a una y nunca más allá del final (sin la lectura anticipada de file.inputStream,
                        // que pide un bloque de más que algunos servidores no contestan y deja colgado el cierre)
                        val chunk = conn.connectionContext.negotiatedProtocol.maxReadSize.coerceIn(64 * 1024, 4 shl 20)
                        val buf = ByteArray(chunk)
                        FileOutputStream(dest, offset > 0).use { out ->
                            var total = offset
                            while (total < size) {
                                val n = file.read(buf, total, 0, minOf(chunk.toLong(), size - total).toInt())
                                if (n <= 0) break
                                out.write(buf, 0, n)
                                total += n
                                if (!onChunk(total)) return null
                            }
                            out.fd.sync()
                            return size
                        }
                    }
                }
            }
        } catch (e: UnknownHostException) {
            throw IOException("No se encuentra el equipo \"${location.host}\" en la red.")
        } catch (e: SMBApiException) {
            throw IOException(explain(e), e)
        } finally {
            client.close()
        }
    }

    /**
     * Al terminar se corta la conexión sin despedirse (logoff): hay servidores SMB que no contestan
     * a la despedida y el escaneo o la descarga se quedarían esperando hasta que venza el tiempo.
     */
    private inline fun <T> com.hierynomus.smbj.connection.Connection.forceClosing(block: (com.hierynomus.smbj.connection.Connection) -> T): T =
        try { block(this) } finally { runCatching { close(true) } }

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
            status.contains("OBJECT_NAME_NOT_FOUND") || status.contains("OBJECT_PATH_NOT_FOUND") ->
                "El archivo ya no está en la carpeta compartida del PC"
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
            return Uri.parse("smb://$auth${location.authority}/$segments")
        }
    }
}
