document.addEventListener('DOMContentLoaded', async function () {
    try {
        // Get class ID from URL
        const pathParts = window.location.pathname.split('/');
        const classId = pathParts[pathParts.indexOf('attendance') + 1];

        if (!classId || isNaN(classId)) {
            throw new Error('Invalid class ID in URL');
        }

        // Set current date
        const today = new Date();
        const currentDate = today.toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = currentDate;

        // Initialize save button
        const saveBtn = document.getElementById('saveAttendance');
        saveBtn.disabled = true;

        // Load class details
        const classRes = await fetch(`/teacher/classes/${classId}/data`);
        if (!classRes.ok) throw new Error('Failed to load class details');

        const classData = await classRes.json();
        if (!classData?.success || !classData?.data?.class) {
            throw new Error('Invalid class data structure');
        }

        document.getElementById('currentClassName').textContent = classData.data.class.name;

        // Add enroll button if no students
        if (classData.data.stats?.totalStudents === 0) {
            const enrollBtn = document.createElement('a');
            enrollBtn.href = `/teacher/classes/${classId}/enroll`;
            enrollBtn.className = 'btn btn-sm btn-primary ms-3';
            enrollBtn.innerHTML = '<i class="fas fa-user-plus me-1"></i> Add Students';
            document.getElementById('currentClassName').after(enrollBtn);
        }

        // Load attendance
        await loadAttendanceData(classId, currentDate);

        // Date change
        document.getElementById('attendanceDate').addEventListener('change', async function () {
            await loadAttendanceData(classId, this.value);
        });

        // Save handler
        saveBtn.addEventListener('click', async function () {
            await saveAttendanceData(classId, document.getElementById('attendanceDate').value);
        });

        // ✅ Fix: Now register the logout and other listeners
        setupEventListeners();

    } catch (error) {
        console.error("Initialization error:", error);
        document.getElementById('classAlert').classList.remove('d-none');
        document.getElementById('classAlertMessage').textContent = error.message;
        document.getElementById('attendanceTable').style.display = 'none';
    }
});


// ======================
// FUNCTIONS
// ======================

async function loadAttendanceData(classId, date) {
    const saveBtn = document.getElementById('saveAttendance');
    const tbody = document.querySelector('#attendanceTable tbody');

    try {
        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading attendance data...</p>
                </td>
            </tr>
        `;

        const sessionRes = await fetch('/session');
        if (!sessionRes.ok) {
            throw new Error('Session expired - please refresh the page');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/teacher/attendance/${classId}/${date}`, {
            credentials: 'include',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorData = await response.json();
                errorDetails = errorData.message || `HTTP ${response.status}`;
            } catch {
                errorDetails = `HTTP ${response.status}`;
            }
            throw new Error(`Server response: ${errorDetails}`);
        }

        const result = await response.json();

        if (!result.success || !result.data || !result.data.class) {
            throw new Error(result.message || 'Attendance data unavailable');
        }

        const { data } = result;
        const { class: classInfo, totalStudents, attendanceRecords = [] } = data;

        if (totalStudents === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" class="text-center py-4">
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            No students enrolled in this class
                        </div>
                        <a href="/teacher/classes/${classId}/enroll" class="btn btn-sm btn-primary mt-2">
                            <i class="fas fa-user-plus me-1"></i> Enroll Students
                        </a>
                    </td>
                </tr>
            `;
            saveBtn.disabled = true;
            return;
        }

        if (attendanceRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="2" class="text-center py-4">
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No attendance records found for selected date
                        </div>
                    </td>
                </tr>
            `;
            saveBtn.disabled = true;
            return;
        }

        tbody.innerHTML = attendanceRecords.map(student => `
            <tr>
                <td>${student.first_name} ${student.last_name}</td>
                <td>
                    <select class="form-select status-select ${student.status || 'present'}" 
                            data-student-id="${student.id}">
                        <option value="present" ${student.status === 'present' ? 'selected' : ''}>Present</option>
                        <option value="absent" ${student.status === 'absent' ? 'selected' : ''}>Absent</option>
                        <option value="late" ${student.status === 'late' ? 'selected' : ''}>Late</option>
                    </select>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', function () {
                this.className = `form-select status-select ${this.value}`;
                saveBtn.disabled = false;
            });
        });

        saveBtn.disabled = true;

    } catch (error) {
        console.error("Attendance load failed:", error);

        let errorMessage = error.name === 'AbortError' ? 'Request timed out - please try again' : error.message;

        tbody.innerHTML = `
            <tr>
                <td colspan="2" class="text-center py-4">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        ${errorMessage}
                    </div>
                    <button id="refreshButton" class="btn btn-secondary mt-2">
                        <i class="fas fa-sync-alt me-1"></i> Refresh Page
                    </button>
                </td>
            </tr>
        `;

        saveBtn.disabled = true;

        const refreshBtn = document.getElementById('refreshButton');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => window.location.reload());
        }
    }
}

async function saveAttendanceData(classId, date) {
    const saveBtn = document.getElementById('saveAttendance');

    try {
        const attendanceData = {};
        document.querySelectorAll('.status-select').forEach(select => {
            attendanceData[select.dataset.studentId] = select.value;
        });

        const originalBtnHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Saving...';
        saveBtn.disabled = true;

        const response = await fetch(`/teacher/attendance/${classId}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, attendance: attendanceData })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to save attendance');
        }

        saveBtn.innerHTML = '<i class="fas fa-check me-2"></i> Saved';
        setTimeout(() => {
            saveBtn.innerHTML = originalBtnHTML;
            saveBtn.disabled = true;
        }, 2000);

    } catch (error) {
        console.error("Save error:", error);
        saveBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i> Error';
        saveBtn.disabled = false;

        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-save me-2"></i> Save Attendance';
        }, 2000);

        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger mt-3';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle me-2"></i>
            ${error.message}
        `;
        document.querySelector('.attendance-container').prepend(errorDiv);

        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}


// ==========================
// LOGOUT + TOAST UTILITIES
// ==========================

function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/auth/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });

                if (response.ok) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/';
                } else {
                    throw new Error('Logout failed');
                }
            } catch (error) {
                console.error('Logout error:', error);
                showToast('Failed to logout', 'error');
            }
        });
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast show';

    switch (type) {
        case 'error': toast.style.backgroundColor = '#dc3545'; break;
        case 'success': toast.style.backgroundColor = '#28a745'; break;
        case 'warning': toast.style.backgroundColor = '#ffc107'; break;
        default: toast.style.backgroundColor = '#17a2b8';
    }

    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}
