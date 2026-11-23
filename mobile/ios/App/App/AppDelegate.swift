import UIKit
import Capacitor

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

/// The screen that holds the website. Adds the two things that make it feel
/// like an iPhone app instead of a browser:
///  - swipe from the left edge to go back (and from the right to go forward)
///  - pull down to refresh, with a light tap of feedback
/// SceneDelegate.swift creates this screen instead of the plain Capacitor one.
///
/// The site's header is fixed at the top and would hide the standard pull-to-
/// refresh spinner, so the spinner shows just below the header instead, in a
/// small dark circle, until the page has finished loading.
class MainViewController: CAPBridgeViewController {
    private let refresher = UIRefreshControl()
    private let badge = UIView()
    private let spinner = UIActivityIndicatorView(style: .medium)
    private var loadingWatch: NSKeyValueObservation?
    private var shownAt = Date.distantPast

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        print("UA app: MainViewController loaded")
        setUpGestures()
    }

    // Capacitor turns bouncing off; set everything again once the screen is
    // showing, so nothing set up later can switch it back off.
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        setUpGestures()
    }

    private func setUpGestures() {
        guard let webView = webView else { return }
        webView.allowsBackForwardNavigationGestures = true
        let scroll = webView.scrollView
        scroll.bounces = true
        scroll.alwaysBounceVertical = true
        if scroll.refreshControl !== refresher {
            // The built-in spinner would sit behind the header, so hide it and use our own.
            refresher.tintColor = .clear
            refresher.addTarget(self, action: #selector(pulledToRefresh), for: .valueChanged)
            scroll.refreshControl = refresher
        }
        setUpBadge()
        print("UA app: swipe-back and pull-to-refresh are on")
    }

    private func setUpBadge() {
        guard badge.superview == nil else { return }
        badge.backgroundColor = UIColor(red: 0.01, green: 0.04, blue: 0.09, alpha: 0.92) // #020b18
        badge.layer.cornerRadius = 20
        badge.layer.borderWidth = 1
        badge.layer.borderColor = UIColor(red: 0.76, green: 0.89, blue: 0.98, alpha: 0.25).cgColor
        badge.isUserInteractionEnabled = false
        badge.alpha = 0
        badge.translatesAutoresizingMaskIntoConstraints = false
        spinner.color = UIColor(red: 0.76, green: 0.89, blue: 0.98, alpha: 1) // #c2e4fa
        spinner.translatesAutoresizingMaskIntoConstraints = false
        badge.addSubview(spinner)
        view.addSubview(badge)
        NSLayoutConstraint.activate([
            badge.widthAnchor.constraint(equalToConstant: 40),
            badge.heightAnchor.constraint(equalToConstant: 40),
            badge.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            // Just under the site's header (about 76pt tall below the clock).
            badge.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 84),
            spinner.centerXAnchor.constraint(equalTo: badge.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: badge.centerYAnchor),
        ])
    }

    @objc private func pulledToRefresh() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        refresher.endRefreshing()
        showBadge()
        webView?.reload()
        // Hide the spinner once the page says it's done loading.
        loadingWatch = webView?.observe(\.isLoading, options: [.new]) { [weak self] web, _ in
            if !web.isLoading { DispatchQueue.main.async { self?.hideBadge() } }
        }
        // Never leave it spinning, even if the load never reports back.
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in self?.hideBadge() }
    }

    private func showBadge() {
        view.bringSubviewToFront(badge)
        shownAt = Date()
        spinner.startAnimating()
        UIView.animate(withDuration: 0.15) { self.badge.alpha = 1 }
    }

    private func hideBadge() {
        // Stay up at least half a second so it never just flickers.
        let wait = max(0, 0.5 - Date().timeIntervalSince(shownAt))
        DispatchQueue.main.asyncAfter(deadline: .now() + wait) { [weak self] in
            guard let self = self else { return }
            self.loadingWatch = nil
            UIView.animate(withDuration: 0.2, animations: { self.badge.alpha = 0 }) { _ in
                self.spinner.stopAnimating()
            }
        }
    }
}
