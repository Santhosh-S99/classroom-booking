/**
 * Improved Classroom Booking System
 * Version 4.0 - Fixed Logic Issues
 * 
 * Fixes:
 * 1. Proper recurring booking conflict detection
 * 2. Individual recurring booking cancellation
 * 3. Auto-cleanup of expired bookings
 * 4. Enhanced validation and error handling
 */

class ImprovedClassroomBookingSystem {
    constructor() {
        // Application state
        this.currentUser = null;
        this.selectedDate = null;
        this.selectedTime = null;
        this.selectedClassroom = null;
        this.selectedRecurringDay = null;
        this.selectedRecurringTime = null;
        this.selectedRecurringClassroom = null;
        this.allBookings = [];
        this.recurringBookings = [];
        this.currentBookingType = 'one-time';

        // Calendar state
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();

        // Cleanup interval (check every 5 minutes)
        this.cleanupInterval = null;

        // Configuration
        this.timeSlots = [
            '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00',
            '16:00-17:00', '17:00-18:00'
        ];

        this.classrooms = {
            'classroom-1': { name: 'Classroom 1', capacity: 30 },
            'classroom-2': { name: 'Classroom 2', capacity: 25 },
            'classroom-3': { name: 'Classroom 3', capacity: 40 },
            'classroom-4': { name: 'Classroom 4', capacity: 35 },
            'classroom-5': { name: 'Classroom 5', capacity: 20 },
            'classroom-6': { name: 'Classroom 6', capacity: 45 }
        };

        this.daysOfWeek = [
            'Sunday', 'Monday', 'Tuesday', 'Wednesday', 
            'Thursday', 'Friday', 'Saturday'
        ];

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        if (typeof firebase === 'undefined') {
            console.error('Firebase not loaded. Please include Firebase SDK.');
            setTimeout(() => this.init(), 1000);
            return;
        }

        try {
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            this.setupEventListeners();
            this.setupAuthObserver();
            console.log('Improved Classroom Booking System initialized successfully');
        } catch (error) {
            console.error('Error initializing Firebase:', error);
        }
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('teacherLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Password toggle
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Logout button
        const logoutButton = document.getElementById('logoutButton');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Booking type tabs
        document.querySelectorAll('.booking-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const type = e.target.dataset.type;
                if (type) {
                    this.switchBookingType(type);
                }
            });
        });

        // Calendar navigation
        const prevButton = document.getElementById('prevMonthButton');
        const nextButton = document.getElementById('nextMonthButton');
        if (prevButton) prevButton.addEventListener('click', () => this.navigateMonth(-1));
        if (nextButton) nextButton.addEventListener('click', () => this.navigateMonth(1));

        // Booking confirmation buttons
        const confirmButton = document.getElementById('confirmBookingButton');
        const confirmRecurringButton = document.getElementById('confirmRecurringButton');
        if (confirmButton) {
            confirmButton.addEventListener('click', () => this.handleBookingConfirmation());
        }
        if (confirmRecurringButton) {
            confirmRecurringButton.addEventListener('click', () => this.handleRecurringBookingConfirmation());
        }
    }

    setupAuthObserver() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.currentUser = user;
                this.showBookingSystem();
                this.loadBookingsRealtime();
                this.loadRecurringBookingsRealtime();
                this.startCleanupService();
            } else {
                this.currentUser = null;
                this.showLoginSection();
                this.stopCleanupService();
            }
        });
    }

    // NEW: Auto-cleanup service for expired bookings
    startCleanupService() {
        // Run cleanup immediately
        this.cleanupExpiredBookings();
        
        // Then run every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredBookings();
        }, 5 * 60 * 1000); // 5 minutes
    }

    stopCleanupService() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    async cleanupExpiredBookings() {
        try {
            const now = new Date();
            const currentTime = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
            const currentDate = this.formatDate(now);

            // Cleanup one-time bookings
            const expiredBookings = this.allBookings.filter(booking => {
                if (booking.date < currentDate) {
                    return true; // Past date
                }
                if (booking.date === currentDate) {
                    const [, endTime] = booking.time.split('-');
                    return this.timeToMinutes(currentTime) > this.timeToMinutes(endTime);
                }
                return false;
            });

            // Delete expired one-time bookings
            for (const booking of expiredBookings) {
                await this.db.collection('bookings').doc(booking.id).delete();
                console.log(`Cleaned up expired booking: ${booking.id}`);
            }

            // Note: Recurring bookings don't get deleted as they repeat weekly
            
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    // Helper function to convert time string to minutes
    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('teacherEmail').value.trim();
        const password = document.getElementById('teacherPassword').value;

        if (!email || !password) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.showNotification('Login successful!', 'success');
            document.getElementById('teacherLoginForm').reset();
        } catch (error) {
            this.showNotification(this.getErrorMessage(error.code), 'error');
        }
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.showNotification('Logged out successfully', 'success');
        } catch (error) {
            this.showNotification('Error logging out: ' + error.message, 'error');
        }
    }

    // IMPROVED: Enhanced conflict detection that includes recurring bookings
    async checkBookingConflict(date, time, classroom, excludeId = null) {
        // Check against one-time bookings
        const oneTimeConflict = this.allBookings.some(booking => 
            booking.date === date && 
            booking.time === time && 
            booking.classroom === classroom &&
            booking.id !== excludeId
        );

        if (oneTimeConflict) {
            return { conflict: true, type: 'one-time' };
        }

        // NEW: Check against recurring bookings
        const targetDate = new Date(date);
        const dayOfWeek = this.daysOfWeek[targetDate.getDay()];

        const recurringConflict = this.recurringBookings.some(recurringBooking => {
            if (recurringBooking.dayOfWeek === dayOfWeek && 
                recurringBooking.time === time && 
                recurringBooking.classroom === classroom &&
                recurringBooking.id !== excludeId) {
                
                // Check if this specific date is in the exceptions list
                const exceptions = recurringBooking.exceptions || [];
                return !exceptions.includes(date);
            }
            return false;
        });

        if (recurringConflict) {
            return { conflict: true, type: 'recurring' };
        }

        return { conflict: false };
    }

    // IMPROVED: Enhanced booking confirmation with better conflict detection
    async handleBookingConfirmation() {
        if (!this.selectedDate || !this.selectedTime || !this.selectedClassroom) {
            this.showNotification('Please select date, time, and classroom', 'error');
            return;
        }

        // Check for conflicts
        const conflictCheck = await this.checkBookingConflict(
            this.selectedDate, 
            this.selectedTime, 
            this.selectedClassroom
        );

        if (conflictCheck.conflict) {
            const conflictType = conflictCheck.type === 'recurring' ? 'recurring class' : 'one-time booking';
            this.showNotification(
                `This slot is already booked by another ${conflictType}. Please select a different time or classroom.`, 
                'error'
            );
            return;
        }

        const subject = document.getElementById('subject')?.value.trim() || '';
        const notes = document.getElementById('notes')?.value.trim() || '';

        if (!subject) {
            this.showNotification('Please enter a subject', 'error');
            return;
        }

        try {
            const bookingData = {
                teacherId: this.currentUser.uid,
                teacherEmail: this.currentUser.email,
                teacherName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                subject: subject,
                date: this.selectedDate,
                time: this.selectedTime,
                classroom: this.classrooms[this.selectedClassroom].name,
                notes: notes,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'one-time'
            };

            await this.db.collection('bookings').add(bookingData);
            this.showNotification('Booking confirmed successfully!', 'success');
            this.resetSelections();
            
            // Clear form fields
            if (document.getElementById('subject')) document.getElementById('subject').value = '';
            if (document.getElementById('notes')) document.getElementById('notes').value = '';

        } catch (error) {
            console.error('Error creating booking:', error);
            this.showNotification('Error creating booking: ' + error.message, 'error');
        }
    }

    // IMPROVED: Enhanced recurring booking with exceptions support
    async handleRecurringBookingConfirmation() {
        if (!this.selectedRecurringDay || !this.selectedRecurringTime || !this.selectedRecurringClassroom) {
            this.showNotification('Please select day, time, and classroom', 'error');
            return;
        }

        const subject = document.getElementById('recurringSubject')?.value.trim() || '';
        const notes = document.getElementById('recurringNotes')?.value.trim() || '';

        if (!subject) {
            this.showNotification('Please enter a subject', 'error');
            return;
        }

        // Check for existing recurring booking conflicts
        const existingRecurring = this.recurringBookings.some(booking => 
            booking.dayOfWeek === this.selectedRecurringDay.name && 
            booking.time === this.selectedRecurringTime && 
            booking.classroom === this.classrooms[this.selectedRecurringClassroom].name
        );

        if (existingRecurring) {
            this.showNotification('This recurring slot is already booked. Please select a different time or classroom.', 'error');
            return;
        }

        try {
            const recurringBookingData = {
                teacherId: this.currentUser.uid,
                teacherEmail: this.currentUser.email,
                teacherName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                subject: subject,
                dayOfWeek: this.selectedRecurringDay.name,
                time: this.selectedRecurringTime,
                classroom: this.classrooms[this.selectedRecurringClassroom].name,
                notes: notes,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                type: 'recurring',
                exceptions: [] // NEW: Array to store cancelled dates
            };

            await this.db.collection('recurringBookings').add(recurringBookingData);
            this.showNotification('Recurring booking confirmed successfully!', 'success');
            this.resetSelections();
            
            // Clear form fields
            if (document.getElementById('recurringSubject')) document.getElementById('recurringSubject').value = '';
            if (document.getElementById('recurringNotes')) document.getElementById('recurringNotes').value = '';

        } catch (error) {
            console.error('Error creating recurring booking:', error);
            this.showNotification('Error creating recurring booking: ' + error.message, 'error');
        }
    }

    // NEW: Cancel individual instance of recurring booking
    async cancelRecurringInstance(recurringBookingId, dateToCancel) {
        try {
            const recurringBookingRef = this.db.collection('recurringBookings').doc(recurringBookingId);
            const doc = await recurringBookingRef.get();
            
            if (!doc.exists) {
                throw new Error('Recurring booking not found');
            }

            const bookingData = doc.data();
            const exceptions = bookingData.exceptions || [];
            
            if (!exceptions.includes(dateToCancel)) {
                exceptions.push(dateToCancel);
                
                await recurringBookingRef.update({
                    exceptions: exceptions
                });

                this.showNotification('Individual class cancelled successfully!', 'success');
                console.log(`Cancelled recurring booking instance for ${dateToCancel}`);
            } else {
                this.showNotification('This class is already cancelled', 'info');
            }
        } catch (error) {
            console.error('Error cancelling recurring instance:', error);
            this.showNotification('Error cancelling class: ' + error.message, 'error');
        }
    }

    // NEW: Restore cancelled recurring instance
    async restoreRecurringInstance(recurringBookingId, dateToRestore) {
        try {
            const recurringBookingRef = this.db.collection('recurringBookings').doc(recurringBookingId);
            const doc = await recurringBookingRef.get();
            
            if (!doc.exists) {
                throw new Error('Recurring booking not found');
            }

            const bookingData = doc.data();
            const exceptions = bookingData.exceptions || [];
            const updatedExceptions = exceptions.filter(date => date !== dateToRestore);
            
            await recurringBookingRef.update({
                exceptions: updatedExceptions
            });

            this.showNotification('Class restored successfully!', 'success');
            console.log(`Restored recurring booking instance for ${dateToRestore}`);
        } catch (error) {
            console.error('Error restoring recurring instance:', error);
            this.showNotification('Error restoring class: ' + error.message, 'error');
        }
    }

    loadBookingsRealtime() {
        const bookingsQuery = this.db.collection('bookings').orderBy('timestamp', 'desc');
        
        bookingsQuery.onSnapshot((snapshot) => {
            this.allBookings = [];
            snapshot.forEach((doc) => {
                this.allBookings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            this.updateBookingsDisplay();
            this.generateTimeSlots();
            this.generateClassroomTiles();
        });
    }

    loadRecurringBookingsRealtime() {
        const recurringQuery = this.db.collection('recurringBookings').orderBy('timestamp', 'desc');
        
        recurringQuery.onSnapshot((snapshot) => {
            this.recurringBookings = [];
            snapshot.forEach((doc) => {
                this.recurringBookings.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            this.updateRecurringBookingsDisplay();
            this.generateTimeSlots();
            this.generateClassroomTiles();
            this.generateRecurringTimeSlots();
            this.generateRecurringClassroomTiles();
        });
    }

    // IMPROVED: Enhanced booking display with individual cancellation options
    updateBookingsDisplay() {
        const bookingsList = document.getElementById('bookingsList');
        if (!bookingsList) return;

        if (this.allBookings.length === 0) {
            bookingsList.innerHTML = '<div class="loading-bookings">No bookings found</div>';
            return;
        }

        const today = this.formatDate(new Date());
        const todaysBookings = this.allBookings.filter(booking => booking.date === today);

        bookingsList.innerHTML = todaysBookings.map(booking => {
            const isOwnBooking = booking.teacherId === this.currentUser?.uid;
            return `
                <div class="booking-item ${isOwnBooking ? 'own-booking' : ''}">
                    <div class="booking-header">
                        <div>
                            <div class="booking-title">${booking.subject}</div>
                            <div class="booking-badges">
                                ${isOwnBooking ? '<span class="badge success">Your Booking</span>' : ''}
                                <span class="badge secondary">One-time</span>
                            </div>
                        </div>
                        ${isOwnBooking ? `
                            <button class="btn-delete" onclick="classroomSystem.deleteBooking('${booking.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="booking-details">
                        <div><i class="fas fa-user"></i> ${booking.teacherName}</div>
                        <div><i class="fas fa-door-open"></i> ${booking.classroom}</div>
                        <div><i class="fas fa-clock"></i> ${booking.time}</div>
                        <div><i class="fas fa-calendar"></i> ${booking.date}</div>
                        ${booking.notes ? `<div><i class="fas fa-sticky-note"></i> ${booking.notes}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // NEW: Enhanced recurring bookings display with individual cancellation
    updateRecurringBookingsDisplay() {
        const recurringList = document.getElementById('recurringBookingsList');
        if (!recurringList) return;

        if (this.recurringBookings.length === 0) {
            recurringList.innerHTML = '<div class="loading-bookings">No recurring bookings found</div>';
            return;
        }

        recurringList.innerHTML = this.recurringBookings.map(booking => {
            const isOwnBooking = booking.teacherId === this.currentUser?.uid;
            const exceptions = booking.exceptions || [];
            
            return `
                <div class="booking-item recurring-booking ${isOwnBooking ? 'own-booking' : ''}">
                    <div class="booking-header">
                        <div>
                            <div class="booking-title">${booking.subject}</div>
                            <div class="booking-badges">
                                ${isOwnBooking ? '<span class="badge success">Your Booking</span>' : ''}
                                <span class="badge warning">Recurring</span>
                                ${exceptions.length > 0 ? `<span class="badge secondary">${exceptions.length} Cancelled</span>` : ''}
                            </div>
                        </div>
                        ${isOwnBooking ? `
                            <div style="display: flex; gap: 5px;">
                                <button class="btn-delete btn-manage" onclick="classroomSystem.showRecurringManagement('${booking.id}')">
                                    <i class="fas fa-cog"></i> Manage
                                </button>
                                <button class="btn-delete" onclick="classroomSystem.deleteRecurringBooking('${booking.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    <div class="booking-details">
                        <div><i class="fas fa-user"></i> ${booking.teacherName}</div>
                        <div><i class="fas fa-door-open"></i> ${booking.classroom}</div>
                        <div><i class="fas fa-clock"></i> ${booking.time}</div>
                        <div><i class="fas fa-calendar-alt"></i> Every ${booking.dayOfWeek}</div>
                        ${booking.notes ? `<div><i class="fas fa-sticky-note"></i> ${booking.notes}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // NEW: Show recurring booking management modal
    showRecurringManagement(recurringBookingId) {
        const booking = this.recurringBookings.find(b => b.id === recurringBookingId);
        if (!booking) return;

        const modal = document.createElement('div');
        modal.className = 'recurring-management-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h4>Manage Recurring Class: ${booking.subject}</h4>
                        <button class="modal-close" onclick="this.closest('.recurring-management-modal').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p><strong>Schedule:</strong> Every ${booking.dayOfWeek} at ${booking.time}</p>
                        <p><strong>Classroom:</strong> ${booking.classroom}</p>
                        <div class="recurring-management-section">
                            <h5>Cancel Individual Classes</h5>
                            <div class="date-input-group">
                                <input type="date" id="cancelDate" min="${new Date().toISOString().split('T')[0]}">
                                <button class="btn-cancel-instance" onclick="classroomSystem.handleInstanceCancellation('${recurringBookingId}')">
                                    Cancel This Date
                                </button>
                            </div>
                        </div>
                        ${booking.exceptions && booking.exceptions.length > 0 ? `
                            <div class="recurring-management-section">
                                <h5>Cancelled Classes</h5>
                                <div class="cancelled-instances">
                                    ${booking.exceptions.map(date => `
                                        <div class="cancelled-instance">
                                            <span>${date}</span>
                                            <button class="btn-restore" onclick="classroomSystem.restoreRecurringInstance('${recurringBookingId}', '${date}')">
                                                Restore
                                            </button>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // NEW: Handle individual instance cancellation
    async handleInstanceCancellation(recurringBookingId) {
        const dateInput = document.getElementById('cancelDate');
        const dateToCancel = dateInput.value;

        if (!dateToCancel) {
            this.showNotification('Please select a date to cancel', 'error');
            return;
        }

        // Verify the date matches the day of week
        const booking = this.recurringBookings.find(b => b.id === recurringBookingId);
        const selectedDate = new Date(dateToCancel);
        const dayOfWeek = this.daysOfWeek[selectedDate.getDay()];

        if (dayOfWeek !== booking.dayOfWeek) {
            this.showNotification(`This date is not a ${booking.dayOfWeek}. Please select the correct day.`, 'error');
            return;
        }

        await this.cancelRecurringInstance(recurringBookingId, dateToCancel);
        
        // Close modal and refresh
        document.querySelector('.recurring-management-modal')?.remove();
    }

    // Enhanced UI generation methods
    showBookingSystem() {
        const loginSection = document.getElementById('loginSection');
        const bookingSystem = document.getElementById('bookingSystem');
        if (loginSection) loginSection.style.display = 'none';
        if (bookingSystem) bookingSystem.style.display = 'block';

        this.updateUserInfo();
        this.generateCalendar();
        this.generateDayTiles();
        this.generateTimeSlots();
        this.generateRecurringTimeSlots();
        this.generateClassroomTiles();
        this.generateRecurringClassroomTiles();
    }

    showLoginSection() {
        const loginSection = document.getElementById('loginSection');
        const bookingSystem = document.getElementById('bookingSystem');
        if (loginSection) loginSection.style.display = 'block';
        if (bookingSystem) bookingSystem.style.display = 'none';
    }

    updateUserInfo() {
        const nameElement = document.getElementById('currentUserName');
        const emailElement = document.getElementById('currentUserEmail');
        if (this.currentUser && nameElement && emailElement) {
            const displayName = this.currentUser.displayName || this.currentUser.email.split('@')[0];
            nameElement.textContent = displayName;
            emailElement.textContent = this.currentUser.email;
        }
    }

    switchBookingType(type) {
        this.currentBookingType = type;
        
        document.querySelectorAll('.booking-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });

        const oneTimeSection = document.getElementById('oneTimeBooking');
        const recurringSection = document.getElementById('recurringBooking');
        if (oneTimeSection) {
            oneTimeSection.style.display = (type === 'one-time') ? 'block' : 'none';
        }
        if (recurringSection) {
            recurringSection.style.display = (type === 'recurring') ? 'block' : 'none';
        }

        this.resetSelections();
    }

    resetSelections() {
        this.selectedDate = null;
        this.selectedTime = null;
        this.selectedClassroom = null;
        this.selectedRecurringDay = null;
        this.selectedRecurringTime = null;
        this.selectedRecurringClassroom = null;

        document.querySelectorAll('.selected').forEach(element => {
            element.classList.remove('selected');
        });

        this.updateBookingConfirmation();
        this.updateRecurringBookingConfirmation();
        this.generateTimeSlots();
        this.generateClassroomTiles();
        this.generateRecurringTimeSlots();
        this.generateRecurringClassroomTiles();
    }

    // Enhanced availability checking methods
    isSlotFullyBooked(date, timeSlot) {
        // Check one-time bookings
        const oneTimeBookings = this.allBookings.filter(booking => 
            booking.date === date && booking.time === timeSlot
        );

        // Check recurring bookings
        const targetDate = new Date(date);
        const dayOfWeek = this.daysOfWeek[targetDate.getDay()];
        
        const recurringBookings = this.recurringBookings.filter(booking => {
            if (booking.dayOfWeek === dayOfWeek && booking.time === timeSlot) {
                const exceptions = booking.exceptions || [];
                return !exceptions.includes(date);
            }
            return false;
        });

        const totalBookings = oneTimeBookings.length + recurringBookings.length;
        return totalBookings >= Object.keys(this.classrooms).length;
    }

    isClassroomBookedForSlot(date, timeSlot, classroomId) {
        // Check one-time bookings
        const oneTimeBooked = this.allBookings.some(booking => 
            booking.date === date && 
            booking.time === timeSlot && 
            booking.classroom === this.classrooms[classroomId].name
        );

        if (oneTimeBooked) return true;

        // Check recurring bookings
        const targetDate = new Date(date);
        const dayOfWeek = this.daysOfWeek[targetDate.getDay()];
        
        return this.recurringBookings.some(booking => {
            if (booking.dayOfWeek === dayOfWeek && 
                booking.time === timeSlot && 
                booking.classroom === this.classrooms[classroomId].name) {
                
                const exceptions = booking.exceptions || [];
                return !exceptions.includes(date);
            }
            return false;
        });
    }

    isRecurringSlotFullyBooked(dayOfWeek, timeSlot) {
        const recurringBookings = this.recurringBookings.filter(booking => 
            booking.dayOfWeek === dayOfWeek && booking.time === timeSlot
        );

        return recurringBookings.length >= Object.keys(this.classrooms).length;
    }

    isRecurringClassroomBooked(dayOfWeek, timeSlot, classroomId) {
        return this.recurringBookings.some(booking => 
            booking.dayOfWeek === dayOfWeek && 
            booking.time === timeSlot && 
            booking.classroom === this.classrooms[classroomId].name
        );
    }

    // Calendar and UI generation methods
    generateCalendar() {
        const calendarGrid = document.getElementById('calendarGrid');
        const monthDisplay = document.getElementById('currentMonthDisplay');
        if (!calendarGrid || !monthDisplay) return;

        calendarGrid.innerHTML = '';
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        monthDisplay.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;

        // Create day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
        const daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

        // Add empty cells for days before the first day
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day disabled';
            calendarGrid.appendChild(emptyCell);
        }

        // Add days of the month
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(this.currentYear, this.currentMonth, day);
            date.setHours(0, 0, 0, 0);

            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';
            dayCell.textContent = day;

            if (date < today) {
                dayCell.classList.add('disabled');
            } else {
                dayCell.addEventListener('click', () => {
                    document.querySelectorAll('.calendar-day.selected').forEach(cell => {
                        cell.classList.remove('selected');
                    });
                    dayCell.classList.add('selected');
                    this.selectedDate = this.formatDate(date);
                    this.generateTimeSlots();
                    this.updateBookingConfirmation();
                });
            }
            calendarGrid.appendChild(dayCell);
        }
    }

    navigateMonth(direction) {
        this.currentMonth += direction;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        } else if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.generateCalendar();
        this.resetSelections();
    }

    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    generateDayTiles() {
        const dayTilesContainer = document.getElementById('dayTiles');
        if (!dayTilesContainer) return;

        dayTilesContainer.innerHTML = '';
        this.daysOfWeek.forEach((dayName, index) => {
            const dayTile = document.createElement('div');
            dayTile.className = 'day-tile';
            dayTile.textContent = dayName;
            dayTile.addEventListener('click', () => {
                document.querySelectorAll('.day-tile.selected').forEach(tile => {
                    tile.classList.remove('selected');
                });
                dayTile.classList.add('selected');
                this.selectedRecurringDay = { index, name: dayName };
                this.generateRecurringTimeSlots();
                this.updateRecurringBookingConfirmation();
            });
            dayTilesContainer.appendChild(dayTile);
        });
    }

    generateTimeSlots() {
        const timeSlotsGrid = document.getElementById('timeSlotsGrid');
        if (!timeSlotsGrid) return;

        timeSlotsGrid.innerHTML = '';

        if (!this.selectedDate) {
            timeSlotsGrid.innerHTML = '<p class="loading-bookings">Please select a date first.</p>';
            return;
        }

        this.timeSlots.forEach(timeSlot => {
            const slotElement = document.createElement('div');
            slotElement.className = 'time-slot';
            slotElement.textContent = timeSlot;

            if (this.isSlotFullyBooked(this.selectedDate, timeSlot)) {
                slotElement.classList.add('booked');
            } else {
                slotElement.classList.add('available');
                slotElement.addEventListener('click', () => {
                    document.querySelectorAll('#timeSlotsGrid .time-slot.selected').forEach(slot => {
                        slot.classList.remove('selected');
                        slot.classList.add('available');
                    });
                    slotElement.classList.remove('available');
                    slotElement.classList.add('selected');
                    this.selectedTime = timeSlot;
                    this.generateClassroomTiles();
                    this.updateBookingConfirmation();
                });
            }
            timeSlotsGrid.appendChild(slotElement);
        });
    }

    generateRecurringTimeSlots() {
        const recurringTimeSlotsGrid = document.getElementById('recurringTimeSlots');
        if (!recurringTimeSlotsGrid) return;

        recurringTimeSlotsGrid.innerHTML = '';

        if (!this.selectedRecurringDay) {
            recurringTimeSlotsGrid.innerHTML = '<p class="loading-bookings">Please select a day first.</p>';
            return;
        }

        this.timeSlots.forEach(timeSlot => {
            const slotElement = document.createElement('div');
            slotElement.className = 'time-slot';
            slotElement.textContent = timeSlot;

            if (this.isRecurringSlotFullyBooked(this.selectedRecurringDay.name, timeSlot)) {
                slotElement.classList.add('booked');
            } else {
                slotElement.classList.add('available');
                slotElement.addEventListener('click', () => {
                    document.querySelectorAll('#recurringTimeSlots .time-slot.selected').forEach(slot => {
                        slot.classList.remove('selected');
                        slot.classList.add('available');
                    });
                    slotElement.classList.remove('available');
                    slotElement.classList.add('selected');
                    this.selectedRecurringTime = timeSlot;
                    this.generateRecurringClassroomTiles();
                    this.updateRecurringBookingConfirmation();
                });
            }
            recurringTimeSlotsGrid.appendChild(slotElement);
        });
    }

    generateClassroomTiles() {
        const classroomTilesContainer = document.getElementById('classroomTiles');
        if (!classroomTilesContainer) return;

        classroomTilesContainer.innerHTML = '';

        if (!this.selectedDate || !this.selectedTime) {
            classroomTilesContainer.innerHTML = '<p class="loading-bookings">Please select date and time first.</p>';
            return;
        }

        Object.entries(this.classrooms).forEach(([classroomId, classroomInfo]) => {
            const tile = document.createElement('div');
            tile.className = 'classroom-tile';
            
            const isBooked = this.isClassroomBookedForSlot(this.selectedDate, this.selectedTime, classroomId);
            
            tile.innerHTML = `
                <div class="classroom-tile-title">${classroomInfo.name}</div>
                <div class="classroom-tile-capacity">Capacity: ${classroomInfo.capacity}</div>
                <div class="classroom-tile-status"></div>
            `;

            if (isBooked) {
                tile.classList.add('booked');
            } else {
                tile.classList.add('available');
                tile.addEventListener('click', () => {
                    document.querySelectorAll('#classroomTiles .classroom-tile.selected').forEach(t => {
                        t.classList.remove('selected');
                        t.classList.add('available');
                    });
                    tile.classList.remove('available');
                    tile.classList.add('selected');
                    this.selectedClassroom = classroomId;
                    this.updateBookingConfirmation();
                });
            }
            classroomTilesContainer.appendChild(tile);
        });
    }

    generateRecurringClassroomTiles() {
        const classroomTilesContainer = document.getElementById('recurringClassroomTiles');
        if (!classroomTilesContainer) return;

        classroomTilesContainer.innerHTML = '';

        if (!this.selectedRecurringDay || !this.selectedRecurringTime) {
            classroomTilesContainer.innerHTML = '<p class="loading-bookings">Please select day and time first.</p>';
            return;
        }

        Object.entries(this.classrooms).forEach(([classroomId, classroomInfo]) => {
            const tile = document.createElement('div');
            tile.className = 'classroom-tile';
            
            const isBooked = this.isRecurringClassroomBooked(
                this.selectedRecurringDay.name, 
                this.selectedRecurringTime, 
                classroomId
            );
            
            tile.innerHTML = `
                <div class="classroom-tile-title">${classroomInfo.name}</div>
                <div class="classroom-tile-capacity">Capacity: ${classroomInfo.capacity}</div>
                <div class="classroom-tile-status"></div>
            `;

            if (isBooked) {
                tile.classList.add('booked');
            } else {
                tile.classList.add('available');
                tile.addEventListener('click', () => {
                    document.querySelectorAll('#recurringClassroomTiles .classroom-tile.selected').forEach(t => {
                        t.classList.remove('selected');
                        t.classList.add('available');
                    });
                    tile.classList.remove('available');
                    tile.classList.add('selected');
                    this.selectedRecurringClassroom = classroomId;
                    this.updateRecurringBookingConfirmation();
                });
            }
            classroomTilesContainer.appendChild(tile);
        });
    }

    updateBookingConfirmation() {
        const detailsElement = document.getElementById('selectedDetails');
        const confirmButton = document.getElementById('confirmBookingButton');
        
        if (detailsElement) {
            if (this.selectedDate && this.selectedTime && this.selectedClassroom) {
                detailsElement.innerHTML = `
                    <h6>Selected Details:</h6>
                    <p><strong>Date:</strong> ${this.selectedDate}</p>
                    <p><strong>Time:</strong> ${this.selectedTime}</p>
                    <p><strong>Classroom:</strong> ${this.classrooms[this.selectedClassroom].name}</p>
                `;
                if (confirmButton) confirmButton.disabled = false;
            } else {
                detailsElement.innerHTML = '<p>Select date, time, and classroom to confirm booking</p>';
                if (confirmButton) confirmButton.disabled = true;
            }
        }
    }

    updateRecurringBookingConfirmation() {
        const detailsElement = document.getElementById('selectedRecurringDetails');
        const confirmButton = document.getElementById('confirmRecurringButton');
        
        if (detailsElement) {
            if (this.selectedRecurringDay && this.selectedRecurringTime && this.selectedRecurringClassroom) {
                detailsElement.innerHTML = `
                    <h6>Selected Details:</h6>
                    <p><strong>Day:</strong> Every ${this.selectedRecurringDay.name}</p>
                    <p><strong>Time:</strong> ${this.selectedRecurringTime}</p>
                    <p><strong>Classroom:</strong> ${this.classrooms[this.selectedRecurringClassroom].name}</p>
                `;
                if (confirmButton) confirmButton.disabled = false;
            } else {
                detailsElement.innerHTML = '<p>Select day, time, and classroom to confirm recurring booking</p>';
                if (confirmButton) confirmButton.disabled = true;
            }
        }
    }

    // Booking management methods
    async deleteBooking(bookingId) {
        if (!confirm('Are you sure you want to delete this booking?')) {
            return;
        }

        try {
            await this.db.collection('bookings').doc(bookingId).delete();
            this.showNotification('Booking deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting booking:', error);
            this.showNotification('Error deleting booking: ' + error.message, 'error');
        }
    }

    async deleteRecurringBooking(recurringBookingId) {
        if (!confirm('Are you sure you want to delete this entire recurring booking series?')) {
            return;
        }

        try {
            await this.db.collection('recurringBookings').doc(recurringBookingId).delete();
            this.showNotification('Recurring booking deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting recurring booking:', error);
            this.showNotification('Error deleting recurring booking: ' + error.message, 'error');
        }
    }

    // Utility methods
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('teacherPassword');
        const toggleIcon = document.querySelector('#togglePassword i');
        if (passwordInput && toggleIcon) {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                toggleIcon.className = 'fas fa-eye';
            }
        }
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('toastContainer') || this.createToastContainer();
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <div class="toast-header ${type}">
                <i class="${icons[type]}"></i>
                ${type.charAt(0).toUpperCase() + type.slice(1)}
            </div>
            <div class="toast-body">${message}</div>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    getErrorMessage(errorCode) {
        const messages = {
            'auth/user-not-found': 'No account found with this email address',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-email': 'Invalid email address',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection'
        };
        return messages[errorCode] || 'Login failed. Please try again.';
    }
}

// Initialize the system
let classroomSystem;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        classroomSystem = new ImprovedClassroomBookingSystem();
    });
} else {
    classroomSystem = new ImprovedClassroomBookingSystem();
}

// Export for global access
window.classroomSystem = classroomSystem;