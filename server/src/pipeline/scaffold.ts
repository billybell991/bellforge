import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import type { PipelineContext } from './types';

/**
 * Stage 1: Create the Android project skeleton
 * - build.gradle.kts (root + app)
 * - settings.gradle.kts
 * - gradle.properties
 * - AndroidManifest.xml
 * - Gradle wrapper (delegates to standalone)
 */
export async function scaffoldProject(ctx: PipelineContext): Promise<void> {
  ctx.sendProgress('init', 'Initializing Project', 5, 'Creating Android project scaffold...');

  // Create directory structure
  const dirs = [
    ctx.projectDir,
    ctx.appDir,
    path.join(ctx.appDir, 'src', 'main', 'java', 'com', 'bellforge', 'game'),
    path.join(ctx.appDir, 'src', 'main', 'res', 'drawable'),
    path.join(ctx.appDir, 'src', 'main', 'res', 'values'),
    path.join(ctx.appDir, 'src', 'main', 'res', 'raw'),
  ];

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true });
  }

  // Root build.gradle.kts
  await writeFile(path.join(ctx.projectDir, 'build.gradle.kts'), `
plugins {
    id("com.android.application") version "8.1.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.0" apply false
}
`.trimStart());

  // settings.gradle.kts
  await writeFile(path.join(ctx.projectDir, 'settings.gradle.kts'), `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_PROJECT)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${ctx.safeName}"
include(":app")
`.trimStart());

  // gradle.properties
  await writeFile(path.join(ctx.projectDir, 'gradle.properties'), `
org.gradle.jvmargs=-Xmx2048m
android.useAndroidX=true
android.enableJetifier=true
`.trimStart());

  // App build.gradle.kts
  await writeFile(path.join(ctx.appDir, 'build.gradle.kts'), `
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.bellforge.game"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.bellforge.game"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
}
`.trimStart());

  // AndroidManifest.xml
  await writeFile(path.join(ctx.appDir, 'src', 'main', 'AndroidManifest.xml'), `
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:label="${escapeXml(ctx.config.story.title || 'BellForge Game')}"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`.trimStart());

  // res/values/strings.xml
  await writeFile(path.join(ctx.appDir, 'src', 'main', 'res', 'values', 'strings.xml'), `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${escapeXml(ctx.config.story.title || 'BellForge Game')}</string>
</resources>
`.trimStart());
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
