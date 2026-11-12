package expo.modules.focutimeblocker

import android.app.Activity
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FocuTimeBlockerModule : Module() {
  private var isBlocking = false
  private var blockedApps: List<String> = emptyList()

  /** Cached launcher-app list for the app picker (populated on first request). */
  private var installedAppsCache: List<Map<String, Any>>? = null

  override fun definition() = ModuleDefinition {
    Name("FocuTimeBlocker")

    Function("isUsageStatsPermissionGranted") {
      isUsageStatsPermissionGranted()
    }

    Function("requestUsageStatsPermission") {
      requestUsageStatsPermission()
    }

    Function("requestOverlayPermission") {
      requestOverlayPermission()
    }

    Function("openAccessibilitySettings") {
      openAccessibilitySettings()
    }

    Function("startBlocking") { apps: List<String>, durationMinutes: Int ->
      startBlocking(apps, durationMinutes)
    }

    Function("stopBlocking") {
      stopBlocking()
    }

    Function("isOverlayPermissionGranted") {
      isOverlayPermissionGranted()
    }

    Function("isLockTaskSupported") {
      isLockTaskSupported()
    }

    Function("isAccessibilityServiceEnabled") {
      isAccessibilityServiceEnabled()
    }

    AsyncFunction("getInstalledApps") { refresh: Boolean ->
      getInstalledApps(refresh)
    }

    AsyncFunction("checkAllPermissions") {
      mapOf(
        "usageStatsGranted" to isUsageStatsPermissionGranted(),
        "overlayGranted" to isOverlayPermissionGranted(),
        "lockTaskSupported" to isLockTaskSupported(),
        "accessibilityServiceEnabled" to isAccessibilityServiceEnabled()
      )
    }
  }

  private fun getContext(): Context {
    return appContext.reactContext ?: throw IllegalStateException("React context not available")
  }

  private fun getCurrentActivity(): Activity? {
    return appContext.currentActivity
  }

  private fun isUsageStatsPermissionGranted(): Boolean {
    val appOps = getContext().getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
      AppOpsManager.OPSTR_GET_USAGE_STATS,
      Process.myUid(),
      getContext().packageName
    )
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun requestUsageStatsPermission(): Boolean {
    if (!isUsageStatsPermissionGranted()) {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      getContext().startActivity(intent)
      return false
    }
    return true
  }

  private fun isOverlayPermissionGranted(): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      return Settings.canDrawOverlays(getContext())
    }
    return true
  }

  /**
   * Opens the "Display over other apps" screen for this app specifically
   * (Settings.ACTION_MANAGE_OVERLAY_PERMISSION), not the generic app-info page.
   */
  private fun requestOverlayPermission(): Boolean {
    if (isOverlayPermissionGranted()) return true
    val context = getContext()
    val intent = Intent(
      Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
      Uri.parse("package:" + context.packageName)
    )
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (e: Exception) {
      context.startActivity(
        Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
    return false
  }

  private fun openAccessibilitySettings(): Boolean {
    val context = getContext()
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (e: Exception) {
      context.startActivity(
        Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
    return true
  }

  private fun isLockTaskSupported(): Boolean {
    val dpm = getContext().getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    val admin = ComponentName(getContext(), FocuTimeAdminReceiver::class.java)
    return dpm.isAdminActive(admin)
  }

  private fun isAccessibilityServiceEnabled(): Boolean {
    val context = getContext()
    val expected = ComponentName(context, FocuTimeAccessibilityService::class.java)
    val flat = expected.flattenToString()

    val enabledServices = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false

    // Compare full component names so a similar-looking entry can't match by accident.
    return enabledServices.split(':').any { it.equals(flat, ignoreCase = true) }
  }

  /**
   * Launcher apps the user could block, for the app-selection screen.
   * Result is cached for the lifetime of the process unless [refresh] is true.
   */
  private fun getInstalledApps(refresh: Boolean): List<Map<String, Any>> {
    if (!refresh) {
      installedAppsCache?.let { return it }
    }

    val context = getContext()
    val pm = context.packageManager
    val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
    val resolved = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
    } else {
      @Suppress("DEPRECATION")
      pm.queryIntentActivities(intent, 0)
    }

    val seen = HashSet<String>()
    val apps = ArrayList<Map<String, Any>>()
    for (info in resolved) {
      val packageName = info.activityInfo?.packageName ?: continue
      if (packageName == context.packageName) continue
      if (!seen.add(packageName)) continue

      val label = try {
        info.loadLabel(pm).toString()
      } catch (e: Exception) {
        packageName
      }
      val isSystem = try {
        val ai = pm.getApplicationInfo(packageName, 0)
        (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0
      } catch (e: Exception) {
        false
      }

      apps.add(
        mapOf(
          "package" to packageName,
          "label" to label,
          "isSystem" to isSystem
        )
      )
    }

    apps.sortBy { (it["label"] as String).lowercase() }
    installedAppsCache = apps
    return apps
  }

  /**
   * Stores the selection where the accessibility service reads it and starts
   * the overlay service. Returns whether the service that actually enforces the
   * block is enabled, so the UI can tell the user the truth.
   */
  private fun startBlocking(apps: List<String>, durationMinutes: Int): Map<String, Any> {
    blockedApps = apps
    isBlocking = true

    // Store blocked apps in shared preferences for AccessibilityService to read
    val prefs = getContext().getSharedPreferences("focutime_blocker", Context.MODE_PRIVATE)
    prefs.edit()
      .putStringSet("blocked_apps", apps.toSet())
      .putLong("block_until", System.currentTimeMillis() + durationMinutes * 60 * 1000L)
      .apply()

    // Start the overlay service to show focus overlay
    val overlayIntent = Intent(getContext(), FocuTimeOverlayService::class.java)
    overlayIntent.putExtra("duration_minutes", durationMinutes)
    try {
      getContext().startService(overlayIntent)
    } catch (e: Exception) {
      // Overlay is cosmetic — blocking still works through the accessibility service.
      e.printStackTrace()
    }

    return mapOf(
      "success" to true,
      "blockedCount" to apps.size,
      "accessibilityServiceEnabled" to isAccessibilityServiceEnabled()
    )
  }

  private fun stopBlocking() {
    isBlocking = false
    blockedApps = emptyList()

    val prefs = getContext().getSharedPreferences("focutime_blocker", Context.MODE_PRIVATE)
    prefs.edit().clear().apply()

    // Stop overlay service
    val overlayIntent = Intent(getContext(), FocuTimeOverlayService::class.java)
    getContext().stopService(overlayIntent)

    // Stop lock task mode if active
    try {
      getCurrentActivity()?.stopLockTask()
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
