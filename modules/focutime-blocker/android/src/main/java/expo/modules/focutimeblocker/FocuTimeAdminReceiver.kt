package expo.modules.focutimeblocker

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

/**
 * Device Admin Receiver for Lock Task (Screen Pinning) support.
 * Required to lock the device into FocuTime during a focus session.
 */
class FocuTimeAdminReceiver : DeviceAdminReceiver() {

  override fun onEnabled(context: Context, intent: Intent) {
    super.onEnabled(context, intent)
    Toast.makeText(context, "FocuTime: Device admin enabled for Lock Task", Toast.LENGTH_SHORT).show()
  }

  override fun onDisabled(context: Context, intent: Intent) {
    super.onDisabled(context, intent)
    Toast.makeText(context, "FocuTime: Device admin disabled", Toast.LENGTH_SHORT).show()
  }
}