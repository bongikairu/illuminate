function startGA() {
    window.dataLayer = window.dataLayer || [];

    function gtag() {
        dataLayer.push(arguments);
    }

    gtag('js', new Date());
    gtag('config', 'UA-120833732-1', {
        'anonymize_ip': true,
    });

    var elem = document.createElement('script');
    elem.src = "https://www.googletagmanager.com/gtag/js?id=UA-120833732-1";
    elem.async = true;
    document.body.appendChild(elem);
}

window.cookieconsent.initialise({
    "palette": {
        "popup": {
            "background": "#000"
        },
        "button": {
            "background": "#f1d600"
        }
    },
    "theme": "edgeless",
    "type": "opt-out",
    "revokable": false,
    "content": {
        "message": "This website uses cookies to track visitation. We do not collect your match data.",
        "deny": "No, thanks",
        "link": "Read about it",
        "href": "https://illuminate.dotasphere.com/pp.html"
    },
    "onInitialise": function (status) {
        if (this.hasAnswered() && !this.hasConsented()) {
            // no GA cookies
        } else {
            startGA();
        }
    },
    "onPopupOpen": function () {
        if (this.hasAnswered() && !this.hasConsented()) {
            // no GA cookies
        } else {
            startGA();
        }
    },
    "onStatusChange": function (status) {
        if (this.hasConsented()) {
            if (!window.dataLayer) {
                startGA();
            }
        } else {
            if (window.dataLayer) {
                document.cookie.split(";").forEach(function (c) {
                    if (c.trim().startsWith("cookieconsent_status=")) return;
                    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                window.location.reload();
            }
        }
    },
});