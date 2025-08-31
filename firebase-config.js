// Enhanced Firebase Configuration and Email Settings
// Version 2.0 - Improved error handling and connectivity

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAoD2yRXAZplz61-xDFI1nRcHpg-vYl3hQ",
    authDomain: "classroom-booking-4e8f5.firebaseapp.com",
    projectId: "classroom-booking-4e8f5",
    storageBucket: "classroom-booking-4e8f5.firebasestorage.app",
    messagingSenderId: "697578507271",
    appId: "1:697578507271:web:eb985d20b1c4ade910eea2",
    measurementId: "G-VE4PQ1TKEH"
};

// Gmail Configuration for Email Notifications
// REPLACE WITH YOUR ACTUAL GMAIL CREDENTIALS
const emailConfig = {
    Host: "smtp.gmail.com",
    Username: "santhoshstr385@gmail.com", // Your Gmail address
    Password: "jwxs ipgb eqpe zyeg", // Gmail App Password (not regular password)
    Port: 465,
    SecureToken: true
};

// List of all teacher emails for notifications
// REPLACE WITH ACTUAL TEACHER EMAIL ADDRESSES
const teacherEmails = [
    "santhosh.sak99@gmail.com",
    "postinbox385@gmail.com"
];

// Initialize Firebase with error handling
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
    // Show user-friendly error message
    document.addEventListener('DOMContentLoaded', () => {
        showFirebaseError('Firebase initialization failed. Please check your configuration.');
    });
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Firestore settings for better performance
db.enableNetwork().catch((error) => {
    console.error('Firestore network error:', error);
});

// Enhanced connection monitoring
let connectionStatus = 'connecting';
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

function updateConnectionStatus(status) {
    connectionStatus = status;
    const indicator = document.getElementById('connectionStatus');
    if (!indicator) return;

    // Clear existing content
    indicator.innerHTML = '';
    
    // Create status icon and text
    const statusIcon = document.createElement('i');
    const statusText = document.createElement('span');
    
    indicator.className = 'realtime-indicator ' + status;
    
    switch(status) {
        case 'connected':
            statusIcon.className = 'fas fa-wifi';
            statusText.textContent = 'Connected';
            connectionAttempts = 0; // Reset attempts on successful connection
            break;
        case 'connecting':
            statusIcon.className = 'fas fa-spinner fa-spin';
            statusText.textContent = 'Connecting...';
            break;
        case 'disconnected':
            statusIcon.className = 'fas fa-wifi';
            statusText.textContent = 'Disconnected';
            break;
        case 'error':
            statusIcon.className = 'fas fa-exclamation-triangle';
            statusText.textContent = 'Connection Error';
            break;
    }
    
    indicator.appendChild(statusIcon);
    indicator.appendChild(statusText);
}

// Enhanced authentication state monitoring
auth.onAuthStateChanged((user) => {
    if (user) {
        updateConnectionStatus('connected');
        console.log('User authenticated:', user.email);
        
        // Test Firestore connection
        testFirestoreConnection();
    } else {
        updateConnectionStatus('disconnected');
        console.log('User not authenticated');
    }
});

// Test Firestore connection
async function testFirestoreConnection() {
    try {
        // Try to read from a test collection
        await db.collection('test').limit(1).get();
        updateConnectionStatus('connected');
    } catch (error) {
        console.error('Firestore connection test failed:', error);
        updateConnectionStatus('error');
        
        // Retry connection after delay
        if (connectionAttempts < maxConnectionAttempts) {
            connectionAttempts++;
            setTimeout(() => {
                console.log(`Retrying connection... Attempt ${connectionAttempts}/${maxConnectionAttempts}`);
                testFirestoreConnection();
            }, 2000 * connectionAttempts); // Exponential backoff
        }
    }
}

// Enhanced email notification function with better error handling
window.sendEmailNotification = async function(bookingData, isRecurring = false) {
    // Filter out the current user's email
    const emailList = teacherEmails.filter(email => 
        email !== bookingData.teacherEmail && 
        email.trim() !== '' // Ensure email is not empty
    );
    
    if (emailList.length === 0) {
        console.log('No other teachers to notify');
        return { success: true, message: 'No other teachers to notify' };
    }

    const subject = isRecurring
        ? `🔔 New Weekly Recurring Class: ${bookingData.classroom}`
        : `🔔 New Booking: ${bookingData.classroom}`;

    const bodyText = isRecurring
        ? `A new weekly recurring class has been scheduled:

👨🏫 Teacher: ${bookingData.teacherName} (${bookingData.teacherEmail})
📚 Subject: ${bookingData.subject}
🏫 Classroom: ${bookingData.classroom}
📅 Day: Every ${bookingData.dayOfWeek}
🕐 Time: ${bookingData.time}
📝 Notes: ${bookingData.notes || 'None'}

⏰ Duration: 52 weeks (1 year)
This time slot is now blocked for the next year.

You can manage your bookings at: ${window.location.origin}

---
Enhanced Classroom Booking System
Automated notification system`

        : `A new classroom booking has been made:

👨🏫 Teacher: ${bookingData.teacherName} (${bookingData.teacherEmail})
📚 Subject: ${bookingData.subject}
🏫 Classroom: ${bookingData.classroom}
📅 Date: ${bookingData.date}
🕐 Time: ${bookingData.time}
📝 Notes: ${bookingData.notes || 'None'}

Please check the booking system for details at: ${window.location.origin}

---
Enhanced Classroom Booking System
Automated notification system`;

    const emailPromises = emailList.map(async (email) => {
        try {
            const result = await Email.send({
                Host: emailConfig.Host,
                Username: emailConfig.Username,
                Password: emailConfig.Password,
                Port: emailConfig.Port,
                To: email.trim(),
                From: emailConfig.Username,
                Subject: subject,
                Body: bodyText
            });
            
            console.log(`Email sent successfully to ${email}:`, result);
            return { email, success: true, result };
        } catch (error) {
            console.error(`Failed to send email to ${email}:`, error);
            return { email, success: false, error: error.message };
        }
    });

    try {
        const results = await Promise.allSettled(emailPromises);
        const successCount = results.filter(r => 
            r.status === 'fulfilled' && r.value.success
        ).length;
        
        console.log(`Email notifications sent: ${successCount}/${emailList.length} successful`);
        
        return {
            success: successCount > 0,
            total: emailList.length,
            successful: successCount,
            failed: emailList.length - successCount
        };
    } catch (error) {
        console.error('Error sending email notifications:', error);
        return { success: false, error: error.message };
    }
};

// Function to show Firebase errors to users
function showFirebaseError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'firebase-error-banner';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="error-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add error banner styles
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        padding: 15px;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    const errorContent = errorDiv.querySelector('.error-content');
    errorContent.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 1200px;
        margin: 0 auto;
        gap: 15px;
    `;
    
    const errorClose = errorDiv.querySelector('.error-close');
    errorClose.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 1.2em;
        cursor: pointer;
        padding: 5px;
        border-radius: 3px;
        transition: background 0.3s ease;
    `;
    
    errorClose.addEventListener('mouseover', () => {
        errorClose.style.background = 'rgba(255,255,255,0.2)';
    });
    
    errorClose.addEventListener('mouseout', () => {
        errorClose.style.background = 'none';
    });
    
    document.body.insertBefore(errorDiv, document.body.firstChild);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
}

// Enhanced network status monitoring
window.addEventListener('online', () => {
    console.log('Network connection restored');
    updateConnectionStatus('connecting');
    testFirestoreConnection();
});

window.addEventListener('offline', () => {
    console.log('Network connection lost');
    updateConnectionStatus('disconnected');
});

// Periodic connection health check (every 30 seconds)
setInterval(() => {
    if (connectionStatus === 'connected') {
        testFirestoreConnection();
    }
}, 30000);

// Export enhanced configuration for use in other files
window.firebaseAuth = auth;
window.firebaseDb = db;
window.emailConfig = emailConfig;
window.teacherEmails = teacherEmails;
window.updateConnectionStatus = updateConnectionStatus;

console.log('Enhanced Firebase configuration loaded successfully');
console.log('Email configuration initialized');
console.log(`Configured for ${teacherEmails.length} teachers`);

// Initialize connection status check when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    updateConnectionStatus('connecting');
    
    // Initial connection test
    setTimeout(() => {
        if (firebase.auth().currentUser) {
            testFirestoreConnection();
        }
    }, 1000);
});
