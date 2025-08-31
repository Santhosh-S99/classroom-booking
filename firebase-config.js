/**
 * Enhanced Firebase Configuration with Formspree Integration
 * Version 3.2 - Formspree Email Service
 * 
 * Benefits over SMTP.js:
 * - More reliable than SMTP.js
 * - 1000 emails/month free (perfect for 50/day)
 * - No Gmail app password needed
 * - Works with all modern browsers
 */

// Firebase Configuration (keep your existing config)
const firebaseConfig = {
    apiKey: "AIzaSyAoD2yRXAZplz61-xDFI1nRcHpg-vYl3hQ",
    authDomain: "classroom-booking-4e8f5.firebaseapp.com",
    projectId: "classroom-booking-4e8f5",
    storageBucket: "classroom-booking-4e8f5.firebasestorage.app",
    messagingSenderId: "697578507271",
    appId: "1:697578507271:web:eb985d20b1c4ade910eea2",
    measurementId: "G-VE4PQ1TKEH"
};

// Formspree Configuration
// REPLACE WITH YOUR ACTUAL FORMSPREE FORM ID after setup
const emailConfig = {
    formspreeEndpoint: "mzzagekk", // e.g., "xvgpkjqw"
    fromEmail: "santhoshstr385@gmail.com",       // Your email as sender
    maxRetries: 3,
    retryDelay: 2000
};

// List of all teacher emails for notifications
const teacherEmails = [
    "santhosh.sak99@gmail.com",
    "postinbox385@gmail.com"
];

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();

// Configure Firestore settings
db.enableNetwork().catch((error) => {
    console.error('❌ Firestore network error:', error);
});

// Enhanced Formspree email notification function
window.sendEmailNotification = async function(bookingData, isRecurring = false) {
    console.log('📧 Starting Formspree email notification...', bookingData);
    
    // Check if Formspree is configured
    if (!emailConfig.formspreeEndpoint || emailConfig.formspreeEndpoint === "YOUR_FORMSPREE_FORM_ID") {
        console.error('❌ Formspree not configured. Please update emailConfig in firebase-config.js');
        return { 
            success: false, 
            error: 'Email service not configured',
            details: 'Please set up Formspree endpoint'
        };
    }

    // Filter out the current user's email
    const emailList = teacherEmails.filter(email => 
        email !== bookingData.teacherEmail && 
        email.trim() !== ''
    );
    
    if (emailList.length === 0) {
        console.log('ℹ️ No other teachers to notify');
        return { success: true, message: 'No other teachers to notify' };
    }

    // Prepare email content
    const subject = isRecurring
        ? `🔔 New Weekly Recurring Class: ${bookingData.classroom} - ${bookingData.subject}`
        : `🔔 New Booking: ${bookingData.classroom} - ${bookingData.subject}`;

    const emailContent = isRecurring
        ? createRecurringEmailContent(bookingData)
        : createOneTimeEmailContent(bookingData);

    console.log(`📬 Sending notifications to ${emailList.length} teachers via Formspree`);

    // Send emails to all recipients
    const emailResults = [];
    
    for (const email of emailList) {
        const result = await sendFormspreeEmail(email, subject, emailContent, bookingData);
        emailResults.push({ email, ...result });
    }

    // Analyze results
    const successful = emailResults.filter(r => r.success);
    const failed = emailResults.filter(r => !r.success);

    console.log(`📊 Email Results: ${successful.length}/${emailList.length} successful`);
    
    if (failed.length > 0) {
        console.warn('⚠️ Some emails failed:', failed.map(f => ({ email: f.email, error: f.error })));
    }

    return {
        success: successful.length > 0,
        total: emailList.length,
        successful: successful.length,
        failed: failed.length,
        results: emailResults,
        service: 'Formspree'
    };
};

// Send email via Formspree with retry logic
async function sendFormspreeEmail(toEmail, subject, content, bookingData, attempt = 1) {
    const maxAttempts = emailConfig.maxRetries;
    const formspreeUrl = `https://formspree.io/f/${emailConfig.formspreeEndpoint}`;
    
    console.log(`📤 Sending Formspree email to ${toEmail} (attempt ${attempt}/${maxAttempts})`);
    
    try {
        const emailPayload = {
            _replyto: emailConfig.fromEmail,
            _subject: subject,
            email: toEmail,
            name: toEmail.split('@')[0], // Use email prefix as name
            message: content,
            
            // Additional data for better organization
            booking_type: bookingData.type || 'one-time',
            teacher_name: bookingData.teacherName,
            classroom: bookingData.classroom,
            subject_taught: bookingData.subject,
            date: bookingData.date || bookingData.dayOfWeek,
            time: bookingData.time,
            
            // Formspree hidden fields
            _next: window.location.origin, // Redirect back to our site
            _cc: emailConfig.fromEmail     // CC the sender
        };

        const response = await fetch(formspreeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        const responseData = await response.json();

        if (response.ok) {
            console.log(`✅ Formspree email sent successfully to ${toEmail}`);
            return { 
                success: true, 
                response: responseData,
                attempt: attempt,
                service: 'Formspree'
            };
        } else {
            throw new Error(`Formspree error: ${responseData.error || response.statusText}`);
        }

    } catch (error) {
        console.error(`❌ Formspree email failed to ${toEmail} (attempt ${attempt}):`, error.message);
        
        if (attempt < maxAttempts) {
            console.log(`🔄 Retrying Formspree email to ${toEmail} in ${emailConfig.retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, emailConfig.retryDelay));
            return sendFormspreeEmail(toEmail, subject, content, bookingData, attempt + 1);
        } else {
            return { 
                success: false, 
                error: error.message,
                attempts: attempt,
                finalAttempt: true,
                service: 'Formspree'
            };
        }
    }
}

// Create text email content for one-time bookings (Formspree works best with plain text)
function createOneTimeEmailContent(bookingData) {
    return `
🔔 NEW CLASSROOM BOOKING NOTIFICATION

A new class has been scheduled in the Enhanced Classroom Booking System.

📋 BOOKING DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨🏫 Teacher: ${bookingData.teacherName}
📧 Email: ${bookingData.teacherEmail}
📚 Subject: ${bookingData.subject}
🏫 Classroom: ${bookingData.classroom}
📅 Date: ${formatDateForEmail(bookingData.date)}
🕐 Time: ${bookingData.time}
${bookingData.notes ? `📝 Notes: ${bookingData.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️  NOTICE: This classroom is now booked for the specified time. 
Please check the booking system for any scheduling needs.

📱 Access the booking system at: ${window.location.origin}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enhanced Classroom Booking System
Automated notification • ${new Date().toLocaleString()}
`.trim();
}

// Create text email content for recurring bookings
function createRecurringEmailContent(bookingData) {
    return `
🔔 NEW WEEKLY RECURRING CLASS NOTIFICATION

A new weekly recurring class has been scheduled in the Enhanced Classroom Booking System.

📋 RECURRING CLASS DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👨🏫 Teacher: ${bookingData.teacherName}
📧 Email: ${bookingData.teacherEmail}
📚 Subject: ${bookingData.subject}
🏫 Classroom: ${bookingData.classroom}
📅 Schedule: Every ${bookingData.dayOfWeek}
🕐 Time: ${bookingData.time}
${bookingData.notes ? `📝 Notes: ${bookingData.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ DURATION: This recurring class will run for 52 weeks (1 year).
This time slot is now blocked for the entire duration.

📱 Access the booking system at: ${window.location.origin}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enhanced Classroom Booking System
Automated notification • ${new Date().toLocaleString()}
`.trim();
}

// Format date for email display
function formatDateForEmail(dateStr) {
    try {
        const date = new Date(dateStr);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        return dateStr;
    }
}

// Function to test Formspree configuration
window.testFormspreeConfiguration = async function() {
    console.log('🧪 Testing Formspree configuration...');
    
    if (!emailConfig.formspreeEndpoint || emailConfig.formspreeEndpoint === "YOUR_FORMSPREE_FORM_ID") {
        return { 
            success: false, 
            error: 'Formspree not configured',
            details: 'Please set up your Formspree form and update the endpoint'
        };
    }

    // Test with current user's email
    const testData = {
        teacherName: 'Test Teacher',
        teacherEmail: 'test@example.com',
        subject: 'Test Booking Notification',
        classroom: 'Test Classroom 1',
        date: new Date().toISOString().split('T')[0],
        time: '10:00-11:00',
        notes: 'This is a test notification to verify email service is working correctly.'
    };

    try {
        const testEmail = auth.currentUser?.email || emailConfig.fromEmail;
        const result = await sendFormspreeEmail(
            testEmail,
            '🧪 Test Email - Classroom Booking System',
            createOneTimeEmailContent(testData),
            testData
        );
        
        console.log('📧 Formspree test result:', result);
        return {
            success: result.success,
            result: result,
            service: 'Formspree',
            testEmail: testEmail
        };
    } catch (error) {
        console.error('📧 Formspree test failed:', error);
        return { 
            success: false, 
            error: error.message,
            service: 'Formspree'
        };
    }
};

// Enhanced connection monitoring
let connectionStatus = 'connecting';

function updateConnectionStatus(status) {
    connectionStatus = status;
    const indicator = document.getElementById('connectionStatus');
    if (!indicator) return;

    indicator.className = 'realtime-indicator ' + status;
    
    switch(status) {
        case 'connected':
            indicator.innerHTML = '<i class="fas fa-wifi"></i> <span>Connected</span>';
            break;
        case 'connecting':
            indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Connecting...</span>';
            break;
        case 'disconnected':
            indicator.innerHTML = '<i class="fas fa-wifi"></i> <span>Disconnected</span>';
            break;
    }
}

// Monitor authentication state
auth.onAuthStateChanged((user) => {
    if (user) {
        updateConnectionStatus('connected');
        console.log('✅ User authenticated:', user.email);
    } else {
        updateConnectionStatus('disconnected');
        console.log('ℹ️ User not authenticated');
    }
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    updateConnectionStatus('connecting');
    
    setTimeout(() => {
        if (auth.currentUser) {
            updateConnectionStatus('connected');
        }
    }, 1000);
});

// Export for use in other files
window.firebaseAuth = auth;
window.firebaseDb = db;
window.emailConfig = emailConfig;
window.teacherEmails = teacherEmails;

console.log('✅ Enhanced Firebase configuration with Formspree integration loaded');
console.log('📧 Email service: Formspree');
console.log(`👥 Configured for ${teacherEmails.length} teachers`);
console.log('🔧 Formspree endpoint:', emailConfig.formspreeEndpoint === "YOUR_FORMSPREE_FORM_ID" ? "⚠️ NOT CONFIGURED" : "✅ Ready");
