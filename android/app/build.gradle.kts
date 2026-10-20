plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.cinelocal.android"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.cinelocal.android"
        minSdk = 26
        targetSdk = 36
        versionCode = 7
        versionName = "0.6.0"

        // LibVLC trae librerías nativas por arquitectura: móviles actuales (arm64) y el emulador (x86_64)
        ndk { abiFilters += listOf("arm64-v8a", "x86_64") }
    }

    // Clave de las releases: se configura en ~/.gradle/gradle.properties (CINELOCAL_KEYSTORE, ...), nunca en el repositorio.
    // Las actualizaciones solo se instalan encima si van firmadas con la misma clave: hay que guardarla bien.
    val releaseKeystore = providers.gradleProperty("CINELOCAL_KEYSTORE").orNull
    signingConfigs {
        if (releaseKeystore != null) create("release") {
            storeFile = file(releaseKeystore)
            storePassword = providers.gradleProperty("CINELOCAL_KEYSTORE_PASSWORD").get()
            keyAlias = providers.gradleProperty("CINELOCAL_KEY_ALIAS").get()
            keyPassword = providers.gradleProperty("CINELOCAL_KEY_PASSWORD").get()
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Sin la clave propia se firma con la de depuración, para poder probarla igualmente
            signingConfig = signingConfigs.findByName("release") ?: signingConfigs.getByName("debug")
        }
    }

    applicationVariants.all {
        outputs.all {
            (this as com.android.build.gradle.internal.api.BaseVariantOutputImpl).outputFileName =
                "CineLocal-android-${versionName}" + (if (buildType.name == "release") "" else "-${buildType.name}") + ".apk"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures { compose = true }

    packaging {
        resources {
            excludes += setOf(
                "META-INF/versions/9/OSGI-INF/MANIFEST.MF",
                "META-INF/DEPENDENCIES",
                "META-INF/LICENSE*",
                "META-INF/NOTICE*",
                "META-INF/INDEX.LIST"
            )
        }
        jniLibs { useLegacyPackaging = true }
    }
}

kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.icons.extended)
    implementation(libs.compose.ui.tooling.preview)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.kotlinx.serialization.json)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.okhttp)
    implementation(libs.coil.compose)

    implementation(libs.smbj)
    implementation(libs.bouncycastle)
    implementation(libs.libvlc)

    testImplementation(libs.junit)
}
