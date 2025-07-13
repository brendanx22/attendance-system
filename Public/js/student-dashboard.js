document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Show loading state
    const tableBody = document.getElementById('attendanceTableBody');
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </td>
        </tr>
      `;
    }

    // Get session data
    const sessionRes = await fetch('/session', { 
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!sessionRes.ok) throw new Error('Session check failed');
    
    const { user } = await sessionRes.json();
    if (!user || user.role !== 'student') {
      window.location.href = '/';
      return;
    }

    // Set user info
    const nameElement = document.getElementById('studentName');
    const initialsElement = document.getElementById('studentInitials');
    if (nameElement) nameElement.textContent = user.name || 'Student';
    if (initialsElement) {
      initialsElement.textContent = user.name 
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'S';
    }

    // Get dashboard data
    const dashRes = await fetch('/student/dashboard/data', { 
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!dashRes.ok) throw new Error('Failed to load dashboard data');
    
    const response = await dashRes.json();
    
    // Safely handle the response data
    const attendanceData = response.data?.attendance || [];
    const statsData = response.data?.stats || {
      totalClasses: 0,
      attendanceRate: 0,
      nextClass: 'No upcoming classes'
    };

    // Render data with fallbacks
    renderStats(attendanceData);
    renderAttendanceTable(attendanceData);
    
    // Update stats display
    const percentEl = document.getElementById('attendancePercent');
    const totalEl = document.getElementById('totalClasses');
    const nextClassEl = document.getElementById('nextClass');
    
    if (percentEl) percentEl.textContent = `${statsData.attendanceRate}%`;
    if (totalEl) totalEl.textContent = statsData.totalClasses;
    if (nextClassEl) nextClassEl.textContent = statsData.nextClass;

  } catch (err) {
    console.error('Dashboard error:', err);
    showErrorToast('Failed to load dashboard data');
    
    const noAttendanceMsg = document.getElementById('noAttendanceMessage');
    const tableBody = document.getElementById('attendanceTableBody');
    
    if (noAttendanceMsg) noAttendanceMsg.style.display = 'block';
    if (tableBody) tableBody.innerHTML = '';
  }
});

function renderStats(records) {
  try {
    // Ensure records is an array
    if (!Array.isArray(records)) {
      records = [];
    }

    const total = records.length;
    const present = records.filter(r => r?.status === 'present').length;
    const rate = total ? Math.round((present / total) * 100) : 0;

    const totalEl = document.getElementById('totalClasses');
    const rateEl = document.getElementById('attendanceRate');
    const nextClassEl = document.getElementById('nextClass');

    if (totalEl) totalEl.textContent = total;
    if (rateEl) rateEl.textContent = `${rate}%`;
    if (nextClassEl) nextClassEl.textContent = records[0]?.class_name || 'N/A';
  } catch (error) {
    console.error('Error in renderStats:', error);
  }
}

function renderAttendanceTable(records) {
  try {
    // Ensure records is an array
    if (!Array.isArray(records)) {
      records = [];
    }

    const tbody = document.getElementById('attendanceTableBody');
    const noAttendanceMsg = document.getElementById('noAttendanceMessage');

    if (!tbody) return;

    if (!records.length) {
      if (noAttendanceMsg) noAttendanceMsg.style.display = 'block';
      tbody.innerHTML = '';
      return;
    }

    if (noAttendanceMsg) noAttendanceMsg.style.display = 'none';
    
    tbody.innerHTML = records.map(rec => `
      <tr>
        <td>${new Date(rec.date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })}</td>
        <td><span class="badge ${getStatusClass(rec.status)}">${rec.status}</span></td>
        <td>${rec.class_name || 'Unknown'}</td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error in renderAttendanceTable:', error);
  }
}

function getStatusClass(status) {
  return status === 'present' ? 'bg-success' :
         status === 'absent' ? 'bg-danger' :
         status === 'late' ? 'bg-warning' : 'bg-secondary';
}

function showErrorToast(message) {
  try {
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.innerHTML = `
      <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header bg-danger text-white">
          <strong class="me-auto">Error</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  } catch (error) {
    console.error('Error showing toast:', error);
  }
}

// Logout handler
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.location.href = '/';
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      showErrorToast('Failed to logout');
    }
  });
}