import ExpoModulesCore

public class FocuTimeBlockerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FocuTimeBlocker")

    Function("requestGuidedAccess") {
      // iOS doesn't allow programmatic app blocking.
      // Guided Access must be enabled by the user in Settings.
      // This function opens the Accessibility settings.
      if let url = URL(string: UIApplication.openSettingsURLString) {
        DispatchQueue.main.async {
          UIApplication.shared.open(url)
        }
      }
      return false
    }

    Function("isGuidedAccessEnabled") -> Bool {
      // Check if Guided Access is active
      return UIAccessibility.isGuidedAccessEnabled
    }

    Function("startBlocking") { (apps: [String], durationMinutes: Int) in
      // On iOS, we can't actually block apps.
      // Instead, we suggest the user enable Guided Access.
      // Return instructions for the JS layer to show.
      return [
        "success": true,
        "message": "On iOS, please enable Guided Access: Settings → Accessibility → Guided Access",
        "guidedAccessRequired": true
      ]
    }

    Function("stopBlocking") {
      // No-op on iOS
    }
  }
}