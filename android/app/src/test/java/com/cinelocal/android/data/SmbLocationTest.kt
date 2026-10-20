package com.cinelocal.android.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class SmbLocationTest {

    @Test fun windowsAndSmbPaths() {
        assertEquals(SmbLocation("MI-PC", "Peliculas", ""), SmbLocation.parse("\\\\MI-PC\\Peliculas"))
        assertEquals(SmbLocation("192.168.1.20", "Media", "Cine/HD"), SmbLocation.parse("smb://192.168.1.20/Media/Cine/HD/"))
        assertNull(SmbLocation.parse("\\\\MI-PC"))
        assertNull(SmbLocation.parse(""))
    }

    @Test fun customPort() {
        val l = SmbLocation.parse("\\\\10.0.2.2:4445\\Pelis")!!
        assertEquals("10.0.2.2", l.host)
        assertEquals(4445, l.port)
        assertEquals("10.0.2.2:4445", l.authority)
        assertEquals(SmbLocation("nas", "share", "a", 1445), SmbLocation.parse("smb://nas:1445/share/a"))
        assertEquals("MI-PC", SmbLocation.parse("\\\\MI-PC\\x")!!.authority)
        assertNull(SmbLocation.parse("\\\\pc:99999\\x"))
    }
}
