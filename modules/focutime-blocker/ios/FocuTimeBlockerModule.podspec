Pod::Spec.new do |s|
  s.name = "FocuTimeBlockerModule"
  s.version = "0.1.0"
  s.summary = "FocuTime app blocking native module"
  s.homepage = "https://github.com/focutime"
  s.license = "MIT"
  s.author = "FocuTime Team"
  s.ios.deployment_target = "13.0"
  s.source = { :git => "" }
  s.static_framework = true

  s.dependency "ExpoModulesCore"

  s.source_files = "**/*.{swift}"
end