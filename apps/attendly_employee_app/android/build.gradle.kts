allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    afterEvaluate {
        extensions.findByType<com.android.build.gradle.BaseExtension>()?.apply {
            val sdkStr = compileSdkVersion
            if (sdkStr != null) {
                val versionStr = if (sdkStr.startsWith("android-")) sdkStr.substring(8) else sdkStr
                val version = versionStr.toIntOrNull()
                if (version != null && version < 34) {
                    compileSdkVersion("android-34")
                }
            }
        }
    }
}


subprojects {
    project.evaluationDependsOn(":app")
}


tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
