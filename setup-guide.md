# Enhanced Classroom Booking System

A complete web-based classroom booking system with advanced features including conflict detection, individual recurring booking cancellation, and automatic cleanup of expired bookings.

## 🚀 Features

### ✅ Fixed Issues from Original System

1. **Proper Conflict Detection**
   - Recurring bookings now block one-time bookings for the same date/time/classroom
   - One-time bookings are checked against both existing one-time and recurring bookings
   - Real-time validation prevents double booking

2. **Individual Recurring Booking Cancellation**
   - Cancel individual instances of recurring bookings without affecting the entire series
   - Restore cancelled classes if needed
   - Visual management interface for cancelled instances

3. **Auto-cleanup of Expired Bookings**
   - Automatic deletion of past one-time bookings to optimize storage
   - Runs every 5 minutes in the background
   - Only removes bookings after the class end time has passed

### 🆕 Enhanced Features

- **Real-time Updates**: Live synchronization across all users
- **Enhanced UI**: Modern, responsive design with improved accessibility
- **Better Error Handling**: Comprehensive error messages and connection monitoring
- **Email Notifications**: Automated notifications to other teachers
- **Mobile Responsive**: Works perfectly on all devices
- **Conflict Prevention**: Advanced validation prevents booking conflicts

## 📋 Prerequisites

Before setting up the system, ensure you have:

1. **Firebase Project**: A Google Firebase project with Firestore and Authentication enabled
2. **Gmail Account**: For sending email notifications (with App Password enabled)
3. **Web Server**: Any web server (Apache, Nginx, or live server for development)
4. **Modern Browser**: Chrome, Firefox, Safari, or Edge

## 🛠️ Setup Instructions

### Step 1: Download and Extract Files

1. Create a new folder for your project (e.g., `enhanced-classroom-booking`)
2. Save all the provided files in this folder:
   - `improved-index.html` → rename to `index.html`
   - `improved-classroom-booking.js` → rename to `classroom-booking.js`
   - `enhanced-firebase-config.js` → rename to `firebase-config.js`
   - `enhanced-styles.css` → rename to `styles.css`

### Step 2: Firebase Configuration

#### 2.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or use existing project
3. Follow the setup wizard

#### 2.2 Enable Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select your preferred location

#### 2.3 Enable Authentication
1. Go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" authentication
3. Add your teacher accounts:
   - Go to "Authentication" → "Users"
   - Click "Add user"
   - Add email and password for each teacher

#### 2.4 Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" → "Web"
4. Register your app and copy the config object

#### 2.5 Update firebase-config.js
Replace the `firebaseConfig` object in `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### Step 3: Email Configuration

#### 3.1 Enable 2-Factor Authentication on Gmail
1. Go to your Gmail account settings
2. Enable 2-Factor Authentication

#### 3.2 Generate App Password
1. Go to Google Account settings
2. Navigate to "Security" → "App passwords"
3. Generate a new app password for "Mail"
4. Copy the generated password

#### 3.3 Update Email Configuration
In `firebase-config.js`, update the email settings:

```javascript
const emailConfig = {
    Host: "smtp.gmail.com",
    Username: "your-gmail@gmail.com",
    Password: "your-app-password", // Use app password, not regular password
    Port: 587,
    SecureToken: true
};

const teacherEmails = [
    "teacher1@school.edu",
    "teacher2@school.edu",
    "teacher3@school.edu"
    // Add all teacher emails
];
```

### Step 4: Firestore Security Rules

Set up proper security rules in Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bookings collection
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null;
    }
    
    // Recurring bookings collection
    match /recurringBookings/{bookingId} {
      allow read, write: if request.auth != null;
    }
    
    // Test collection for connection testing
    match /test/{testId} {
      allow read: if request.auth != null;
    }
  }
}
```

### Step 5: Deploy the Application

#### Option A: Local Development Server

1. **Using Live Server (VS Code)**:
   - Install "Live Server" extension in VS Code
   - Right-click on `index.html`
   - Select "Open with Live Server"

2. **Using Python HTTP Server**:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```
   
3. **Using Node.js HTTP Server**:
   ```bash
   npx http-server
   ```

#### Option B: Web Hosting

1. **Firebase Hosting**:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   firebase deploy
   ```

2. **GitHub Pages**:
   - Push files to GitHub repository
   - Enable GitHub Pages in repository settings

3. **Any Web Server**:
   - Upload files to your web server's public folder
   - Ensure all files are in the root directory

### Step 6: Initial Testing

1. Open your application in a web browser
2. Check the connection indicator (top-left corner):
   - Green = Connected
   - Yellow = Connecting
   - Red = Connection issues

3. Log in with teacher credentials you created in Firebase
4. Test booking functionality:
   - Create a one-time booking
   - Create a recurring booking
   - Verify conflict detection works
   - Test individual recurring cancellation

### Step 7: Add Teacher Accounts

1. Go to Firebase Console → Authentication → Users
2. For each teacher, click "Add user":
   - Email: teacher's email address
   - Password: secure password
   - Optional: Display name

3. Share login credentials with teachers securely

## 🔧 Configuration Options

### Customizing Classrooms

Edit the `classrooms` object in `classroom-booking.js`:

```javascript
this.classrooms = {
    'classroom-1': { name: 'Physics Lab', capacity: 30 },
    'classroom-2': { name: 'Chemistry Lab', capacity: 25 },
    'classroom-3': { name: 'Computer Lab', capacity: 40 },
    // Add more classrooms as needed
};
```

### Customizing Time Slots

Edit the `timeSlots` array in `classroom-booking.js`:

```javascript
this.timeSlots = [
    '08:00-09:00',
    '09:00-10:00',
    '10:00-11:00',
    // Add or modify time slots
    '18:00-19:00',
    '19:00-20:00'
];
```

### Customizing Auto-cleanup Interval

Change the cleanup interval in `classroom-booking.js`:

```javascript
// Current: 5 minutes (5 * 60 * 1000)
// Change to 10 minutes:
this.cleanupInterval = setInterval(() => {
    this.cleanupExpiredBookings();
}, 10 * 60 * 1000); // 10 minutes
```

## 📱 Usage Guide

### For Teachers

#### Making a One-time Booking
1. Log in with your credentials
2. Select "One-time Booking" tab
3. Choose date from calendar
4. Select available time slot
5. Pick available classroom
6. Enter subject and optional notes
7. Click "Confirm Booking"

#### Creating Recurring Weekly Classes
1. Select "Weekly Recurring" tab
2. Choose day of the week
3. Select time slot
4. Pick classroom
5. Enter subject and notes
6. Click "Confirm Weekly Booking"

#### Managing Recurring Classes
1. Find your recurring class in the sidebar
2. Click "Manage" button
3. To cancel individual class:
   - Select date to cancel
   - Click "Cancel This Date"
4. To restore cancelled class:
   - Find cancelled date in list
   - Click "Restore" button

#### Viewing Bookings
- Today's bookings appear in the right sidebar
- Your bookings are highlighted in green
- Recurring classes show weekly schedule
- Real-time updates show changes immediately

### For Administrators

#### Monitoring System Status
- Connection indicator shows system health
- System Status card shows all components
- Firebase Console provides detailed analytics

#### Managing Teachers
- Add/remove teachers in Firebase Authentication
- Update teacher emails in `firebase-config.js`
- Monitor booking activity in Firestore Console

## 🔍 Troubleshooting

### Common Issues and Solutions

#### 1. Firebase Connection Issues
**Problem**: Red connection indicator or "Firebase initialization failed"
**Solutions**:
- Check Firebase configuration in `firebase-config.js`
- Ensure Firebase project is active
- Verify API keys are correct
- Check browser console for detailed errors

#### 2. Authentication Problems
**Problem**: Cannot log in or "User not found" error
**Solutions**:
- Verify user exists in Firebase Authentication
- Check email/password combination
- Ensure Authentication is enabled in Firebase
- Clear browser cache and cookies

#### 3. Booking Conflicts Not Detected
**Problem**: Able to double-book classrooms
**Solutions**:
- Refresh the page to get latest data
- Check internet connection
- Verify Firestore rules allow read/write
- Clear browser cache

#### 4. Email Notifications Not Working
**Problem**: Teachers not receiving email notifications
**Solutions**:
- Verify Gmail app password is correct
- Check teacher emails in `firebase-config.js`
- Ensure 2-factor authentication is enabled on Gmail
- Check spam folder for notifications

#### 5. Auto-cleanup Not Working
**Problem**: Old bookings not being deleted automatically
**Solutions**:
- Check browser console for cleanup errors
- Verify Firestore permissions allow delete operations
- Ensure cleanup service is running (user must be logged in)

### Debug Mode

To enable additional logging, open browser console (F12) and run:

```javascript
// Enable debug mode
classroomSystem.debugMode = true;

// Check current bookings
console.log('One-time bookings:', classroomSystem.allBookings);
console.log('Recurring bookings:', classroomSystem.recurringBookings);

// Test cleanup manually
classroomSystem.cleanupExpiredBookings();
```

## 🔒 Security Considerations

### Production Deployment

1. **Update Firestore Rules**: Change from test mode to production rules
2. **Enable Firebase Security**: Configure proper authentication rules
3. **Use HTTPS**: Always serve over secure connection
4. **Secure Email Credentials**: Use environment variables for sensitive data
5. **Regular Backups**: Set up automated Firestore backups

### Recommended Firestore Rules for Production

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.teacherId;
      allow update, delete: if request.auth != null 
        && request.auth.uid == resource.data.teacherId;
    }
    
    match /recurringBookings/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null 
        && request.auth.uid == request.resource.data.teacherId;
      allow update, delete: if request.auth != null 
        && request.auth.uid == resource.data.teacherId;
    }
  }
}
```

## 🚀 Performance Optimization

### For Large Schools

1. **Database Indexing**: Create indexes for frequently queried fields
2. **Pagination**: Implement pagination for booking lists
3. **Caching**: Use browser caching for classroom data
4. **CDN**: Serve static assets from CDN

### Firestore Indexes

Create these indexes in Firebase Console → Firestore → Indexes:

```
Collection: bookings
Fields: date (Ascending), time (Ascending)

Collection: recurringBookings  
Fields: dayOfWeek (Ascending), time (Ascending)
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Check system status and error logs
2. **Monthly**: Review and clean up old data if needed
3. **Quarterly**: Update Firebase SDK versions
4. **Yearly**: Review and update security rules

### Backup Strategy

1. **Automatic Firestore Backups**: Enable in Firebase Console
2. **Code Backups**: Use version control (Git)
3. **Configuration Backups**: Store config files securely

## 📄 License and Credits

This enhanced classroom booking system is built with:
- Firebase for backend services
- Modern JavaScript (ES6+)
- Responsive CSS Grid and Flexbox
- Font Awesome icons
- SMTP.js for email notifications

## 🔄 Updates and Changelog

### Version 4.0 (Current)
- ✅ Fixed recurring booking conflicts with one-time bookings
- ✅ Added individual recurring booking cancellation
- ✅ Implemented auto-cleanup of expired bookings
- ✅ Enhanced UI with better responsive design
- ✅ Added comprehensive error handling
- ✅ Improved email notification system
- ✅ Added real-time connection monitoring

### Future Enhancements
- Mobile app version
- Advanced reporting and analytics
- Integration with school calendar systems
- Bulk booking operations
- Room availability forecasting

---

**For technical support or questions, please check the troubleshooting section or review the browser console for detailed error messages.**