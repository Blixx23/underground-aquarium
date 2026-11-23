import UIKit
import Capacitor
import AuthenticationServices

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

/// The screen that holds the website. Makes it feel like an iPhone app:
///  - swipe from the left edge to go back (and from the right to go forward)
///  - the page rubber-bands past the top like any iPhone app. The site itself
///    (components/app/PullToRefresh.tsx) shows the refresh arrow in the gap
///    that opens under its header and refreshes when you let go, so it can
///    match the site's look exactly.
/// SceneDelegate.swift creates this screen instead of the plain Capacitor one.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        // The app's own sign-in plugin (below): Google in the secure sheet,
        // Apple with the native Face ID sheet.
        bridge?.registerPluginInstance(AppAuthPlugin())
        setUpGestures()
    }

    // Capacitor turns bouncing off; set it again once the screen is showing,
    // so nothing set up later can switch it back off.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setUpGestures()
    }

    private func setUpGestures() {
        guard let webView = webView else { return }
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.bounces = true
        webView.scrollView.alwaysBounceVertical = true
    }
}

/// Sign-in for the app ("AppAuth" in the site's lib/app/nativeSignIn.ts).
///  - webSignIn: opens a sign-in page (Google) in Apple's secure sign-in
///    sheet. Google blocks sign-in inside web views but allows this sheet.
///    It closes by itself when the page sends the person back to
///    com.undergroundaquarium.app://auth-callback and returns that address.
///  - appleSignIn: the native Sign in with Apple sheet. Returns Apple's
///    identity token, which the site hands to Supabase.
/// Closing either sheet rejects with code "CANCELED" so the site stays quiet.
@objc(AppAuthPlugin)
public class AppAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding,
    ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppAuthPlugin"
    public let jsName = "AppAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "webSignIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appleSignIn", returnType: CAPPluginReturnPromise),
    ]

    private var webSession: ASWebAuthenticationSession?
    private var appleCall: CAPPluginCall?

    private func anchor() -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window { return window }
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        return scene?.windows.first(where: { $0.isKeyWindow }) ?? UIWindow()
    }

    @objc func webSignIn(_ call: CAPPluginCall) {
        guard let raw = call.getString("url"), let url = URL(string: raw),
              let scheme = call.getString("callbackScheme") else {
            call.reject("Missing sign-in address")
            return
        }
        DispatchQueue.main.async {
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callbackURL, error in
                self?.webSession = nil
                if let callbackURL = callbackURL {
                    call.resolve(["url": callbackURL.absoluteString])
                } else if let err = error as? ASWebAuthenticationSessionError, err.code == .canceledLogin {
                    call.reject("Sign-in closed", "CANCELED")
                } else {
                    call.reject(error?.localizedDescription ?? "Sign-in didn't finish")
                }
            }
            session.presentationContextProvider = self
            // Keep Safari's sign-ins so people already signed in to Google just tap their account.
            session.prefersEphemeralWebBrowserSession = false
            self.webSession = session
            if !session.start() {
                self.webSession = nil
                call.reject("Couldn't open sign-in")
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return anchor()
    }

    @objc func appleSignIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.fullName, .email]
            request.nonce = call.getString("nonce")
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.appleCall = call
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return anchor()
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = appleCall else { return }
        appleCall = nil
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let token = String(data: tokenData, encoding: .utf8) else {
            call.reject("Apple didn't return a sign-in token")
            return
        }
        var result: [String: Any] = ["identityToken": token]
        if let given = credential.fullName?.givenName { result["givenName"] = given }
        if let family = credential.fullName?.familyName { result["familyName"] = family }
        call.resolve(result)
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        guard let call = appleCall else { return }
        appleCall = nil
        if let err = error as? ASAuthorizationError, err.code == .canceled {
            call.reject("Sign-in closed", "CANCELED")
        } else {
            call.reject(error.localizedDescription)
        }
    }
}
