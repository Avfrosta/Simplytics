(function(apiKey) {
    var url = window.location.hostname + window.location.pathname;
    var referrer = document.referrer || 'direct';
    var timestamp = new Date().toISOString();

    sendRequest('/track', {
        domain: url,
        apiKey: apiKey,
        referrer: referrer,
        timestamp: timestamp
    });

    // Start heartbeat
    var heartbeatInterval;
    let lastHeartbeatTime = Date.now();
    let heartbeatSequence = 0;
    let lastActivityTime = Date.now();

    function updateActivity() {
        const currentTime = Date.now();
        const timeSinceLastActivity = currentTime - lastActivityTime;
        const longInactivityThreshold = 30 * 60 * 1000; // 30 minutes in milliseconds
        
        // If returning after long inactivity, send a new track request
        if (timeSinceLastActivity >= longInactivityThreshold) {
            sendRequest('/track', {
                domain: url,
                apiKey: apiKey,
                referrer: referrer,
                timestamp: new Date().toISOString()
            });
        }
        
        lastActivityTime = currentTime;
        // If heartbeat was stopped due to inactivity, restart it
        if (!heartbeatInterval && !document.hidden) {
            startHeartbeat();
        }
    }

    function sendHeartbeat() {
        const currentTime = Date.now();
        const timeSinceLastActivity = currentTime - lastActivityTime;
        const timeSinceLastHeartbeat = currentTime - lastHeartbeatTime;
        const inactivityThreshold = 120 * 1000;
        const maxHeartbeatGap = 45 * 1000;

        // Stop heartbeat if:
        // 1. User has been inactive, or
        // 2. Time since last heartbeat is too large (indicates sleep/suspend)
        if (timeSinceLastActivity >= inactivityThreshold || timeSinceLastHeartbeat >= maxHeartbeatGap) {
            stopHeartbeat();
            return;
        }

        let duration;
        if (heartbeatSequence === 0) {
            duration = 5;
        } else {
            duration = 30;
        }

        sendRequest('/heartbeat', {
            domain: url,
            apiKey: apiKey,
            timestamp: new Date().toISOString(),
            duration: duration
        });
        
        lastHeartbeatTime = currentTime;
        heartbeatSequence++;
    }

    function startHeartbeat() {
        if (!heartbeatInterval) {
            // Validate last activity time before starting
            const currentTime = Date.now();
            const timeSinceLastActivity = currentTime - lastActivityTime;
            
            if (timeSinceLastActivity >= 120 * 1000) {
                return;
            }

            heartbeatSequence = 0;
            lastHeartbeatTime = Date.now();
            
            clearTimeout(heartbeatInterval);
            
            // Send first heartbeat immediately with 5 second duration
            sendHeartbeat();
            
            // Start regular 30-second interval
            heartbeatInterval = setInterval(sendHeartbeat, 30000);
        }
    }

    function stopHeartbeat() {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        clearTimeout(heartbeatInterval);
    }

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            stopHeartbeat();
        } else {
            startHeartbeat();
        }
    });

    if (!document.hidden) {
        startHeartbeat();
    }

    function sendRequest(endpoint, data) {
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://www.simplytics.dev" + endpoint, true);
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(JSON.stringify(data));
    }

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, updateActivity, true);
    });
})(document.currentScript.getAttribute('data-key'));
