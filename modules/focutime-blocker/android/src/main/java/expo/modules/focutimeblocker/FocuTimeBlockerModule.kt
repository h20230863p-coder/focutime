package expo.modules.focutimeblocker

import android.app.Activity
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FocuTimeBlockerModule : Module() {
  private var isBlocking = false
  private var blockedApps: List<String> = emptyList()

  override fun definition() = ModuleDefinition {
    Name("FocuTimeBlocker")

    Function("isUsageStatsPermissionGranted") {
      isUsageStatsPermissionGranted()
    }

    Function("requestUsageStatsPermission") {
      requestUsageStatsPermission()
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

    AsyncFunction("checkAllPermissions") { promise ->
      try {
        val result = mapOf(
          "usageStatsGranted" to isUsageStatsPermissionGranted(),
          "overlayGranted" to isOverlayPermissionGranted(),
          "lockTaskSupported" to isLockTaskSupported(),
          "accessibilityServiceEnabled" to isAccessibilityServiceEnabled()
        )
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("PERMISSION_CHECK_ERROR", e.message, e)
      }
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

  private fun isLockTaskSupported(): Boolean {
    val dpm = getContext().getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    val admin = ComponentName(getContext(), FocuTimeAdminReceiver::class.java)
    return dpm.isAdminActive(admin)
  }

  private fun isAccessibilityServiceEnabled(): Boolean {
    val service = "${getContext().packageName}/expo.modules.focutimeblocker.FocuTimeAccessibilityService"
    try {
      val enabledServices = Settings.Secure.getString(
        getContext().contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      )
      return enabledServices?.contains(service) == true
    } catch (e: Exception) {
      return false
    }
  }

  private fun startBlocking(apps: List<String>, durationMinutes: Int) {
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
    getContext().startService(overlayIntent)
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
    getCurrentActivity()?.stopLockTask()
  }
}