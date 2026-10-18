# La versión release se compila sin minificar (isMinifyEnabled = false).
# Si se activa R8, hay que conservar LibVLC (usa JNI) y smbj/BouncyCastle (reflexión):
-keep class org.videolan.** { *; }
-keep class com.hierynomus.** { *; }
-keep class org.bouncycastle.** { *; }
-dontwarn org.slf4j.**
-dontwarn javax.el.**
-dontwarn org.ietf.jgss.**
