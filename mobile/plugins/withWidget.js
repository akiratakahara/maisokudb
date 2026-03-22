/**
 * Expo Config Plugin: iOS WidgetKit Extension
 *
 * prebuild 時に Xcode プロジェクトへウィジェットターゲットを追加する
 *
 * 参考: https://docs.expo.dev/config-plugins/plugins-and-mods/
 */
const {
  withXcodeProject,
  withInfoPlist,
  withEntitlementsPlist,
} = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const WIDGET_NAME = "MaisokuWidget";
const WIDGET_BUNDLE_ID_SUFFIX = ".widget";
const DEVELOPMENT_TEAM = "2TZDX2F532";

function withWidget(config) {
  // 1. メインアプリの Info.plist にウィジェット関連設定を追加
  config = withInfoPlist(config, (config) => {
    return config;
  });

  // 2. Xcode プロジェクトにウィジェットターゲットを追加 + リソースバンドル署名修正
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const bundleId = config.ios?.bundleIdentifier || "com.maisokudb.app";
    const widgetBundleId = bundleId + WIDGET_BUNDLE_ID_SUFFIX;
    const projectRoot = config.modRequest.projectRoot;

    // ウィジェットのソースディレクトリを作成
    const widgetDir = path.join(
      projectRoot,
      "ios",
      WIDGET_NAME
    );
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true });
    }

    // Swift ソースをコピー
    const sourceSwift = path.join(
      projectRoot,
      "targets",
      "widget",
      "MaisokuWidget.swift"
    );
    const destSwift = path.join(widgetDir, "MaisokuWidget.swift");
    if (fs.existsSync(sourceSwift)) {
      fs.copyFileSync(sourceSwift, destSwift);
    }

    // Info.plist を生成
    const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>ja</string>
  <key>CFBundleDisplayName</key>
  <string>MaisokuDB</string>
  <key>CFBundleExecutable</key>
  <string>$(EXECUTABLE_NAME)</string>
  <key>CFBundleIdentifier</key>
  <string>${widgetBundleId}</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>$(PRODUCT_NAME)</string>
  <key>CFBundlePackageType</key>
  <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>NSExtension</key>
  <dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.widgetkit-extension</string>
  </dict>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, "Info.plist"), widgetInfoPlist);

    // Xcode プロジェクトにターゲットを追加
    const targetUuid = xcodeProject.generateUuid();
    const groupName = WIDGET_NAME;

    // PBXGroup を追加
    const widgetGroup = xcodeProject.addPbxGroup(
      ["MaisokuWidget.swift", "Info.plist"],
      groupName,
      groupName
    );

    // メインプロジェクトグループに追加
    const mainGroup = xcodeProject.getFirstProject().firstProject.mainGroup;
    xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroup);

    // ネイティブターゲットを追加
    const target = xcodeProject.addTarget(
      WIDGET_NAME,
      "app_extension",
      WIDGET_NAME,
      widgetBundleId
    );

    if (target) {
      // ビルド設定
      const configurations = xcodeProject.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        if (
          typeof configurations[key] === "object" &&
          configurations[key].buildSettings
        ) {
          const bs = configurations[key].buildSettings;
          if (bs.PRODUCT_NAME === `"${WIDGET_NAME}"` || bs.PRODUCT_NAME === WIDGET_NAME) {
            bs.SWIFT_VERSION = "5.0";
            bs.IPHONEOS_DEPLOYMENT_TARGET = "17.0";
            bs.CODE_SIGN_STYLE = "Automatic";
            bs.DEVELOPMENT_TEAM = DEVELOPMENT_TEAM;
            bs.PRODUCT_BUNDLE_IDENTIFIER = `"${widgetBundleId}"`;
            bs.INFOPLIST_FILE = `"${WIDGET_NAME}/Info.plist"`;
            bs.GENERATE_INFOPLIST_FILE = "YES";
            bs.CURRENT_PROJECT_VERSION = "1";
            bs.MARKETING_VERSION = "1.0.0";
            bs.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = "WidgetBackground";
            bs.TARGETED_DEVICE_FAMILY = `"1,2"`;
          }
        }
      }

      // ソースファイルをビルドフェーズに追加
      xcodeProject.addSourceFile(
        `${WIDGET_NAME}/MaisokuWidget.swift`,
        { target: target.uuid },
        widgetGroup.uuid
      );
    }

    // Xcode 14+: 全ターゲットのリソースバンドルにdevelopment teamを設定
    const allConfigurations = xcodeProject.pbxXCBuildConfigurationSection();
    for (const key in allConfigurations) {
      if (
        typeof allConfigurations[key] === "object" &&
        allConfigurations[key].buildSettings
      ) {
        const bs = allConfigurations[key].buildSettings;
        // リソースバンドルターゲット（PRODUCT_BUNDLE_PACKAGE_TYPEがBNDL）にもチーム設定
        if (!bs.DEVELOPMENT_TEAM) {
          bs.DEVELOPMENT_TEAM = DEVELOPMENT_TEAM;
        }
        // CODE_SIGN_IDENTITYが未設定のリソースバンドルに設定
        if (bs.WRAPPER_EXTENSION === '"bundle"' || bs.WRAPPER_EXTENSION === 'bundle') {
          bs.CODE_SIGN_IDENTITY = '""';
        }
      }
    }

    return config;
  });

  return config;
}

module.exports = withWidget;
