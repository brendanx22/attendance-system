document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Check session first
    const sessionRes = await fetch('/session', {
      credentials: 'include'
    });
    
    if (!sessionRes.ok) throw new Error('Session check failed');
    
    const { user } = await sessionRes.json();
    if (!user || user.role !== 'student') {
      window.location.href = '/';
      return;
    }
    
    // Set user info
    setUserInfo(user);

    // Show loading states
    showLoadingStates();

    // Initialize calendar and load data
    await initializeCalendar();
    await loadUpcomingClasses();

  } catch (error) {
    console.error('Initialization error:', error);
    showErrorToast('Failed to load schedule page');
    showErrorStates();
  }
});

async function initializeCalendar() {
  try {
    const calendarEl = document.getElementById('scheduleCalendar');
    if (!calendarEl) throw new Error('Calendar element not found');

    // Create calendar with loading state
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay'
      },
      loading: function(isLoading) {
        const loader = document.getElementById('calendarLoading');
        if (loader) loader.style.display = isLoading ? 'block' : 'none';
      },
      events: async function(fetchInfo, successCallback, failureCallback) {
        try {
          const events = await fetchScheduleData(fetchInfo.start, fetchInfo.end);
          successCallback(events);
        } catch (error) {
          console.error('Calendar events error:', error);
          failureCallback(error);
          showErrorToast('Failed to load calendar events');
        }
      }
    });

    calendar.render();
    return calendar;

  } catch (error) {
    console.error('Calendar initialization error:', error);
    throw error;
  }
}

async function fetchScheduleData(start = null, end = null) {
  try {
    let url = '/student/schedule/data';
    if (start && end) {
      url += `?start=${start.toISOString()}&end=${end.toISOString()}`;
    }

    const response = await fetch(url, {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to fetch schedule data');
    
    return await response.json();
    
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    throw error;
  }
}

async function loadUpcomingClasses() {
  try {
    const container = document.getElementById('upcomingClasses');
    if (!container) return;

    // Show loading state
    container.innerHTML = `
      <div class="list-group-item">
        <div class="d-flex justify-content-center py-2">
          <div class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    `;

    const response = await fetch('/student/schedule/upcoming', {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to load upcoming classes');
    
    const classes = await response.json();

    if (!classes || classes.length === 0) {
      container.innerHTML = `
        <div class="list-group-item text-center py-4 text-muted">
          <i class="fas fa-calendar-times me-2"></i>
          No upcoming classes scheduled
        </div>
      `;
      return;
    }

    container.innerHTML = classes.map(cls => `
      <div class="list-group-item">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1">${cls.class_name || 'Unnamed Class'}</h6>
            <small class="text-muted">${cls.teacher_name || 'Teacher not specified'}</small>
          </div>
          <div class="text-end">
            <small class="d-block">${formatDate(cls.date)}</small>
            <small class="d-block text-muted">${cls.time || ''}</small>
          </div>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error loading upcoming classes:', error);
    const container = document.getElementById('upcomingClasses');
    if (container) {
      container.innerHTML = `
        <div class="list-group-item text-center py-4 text-danger">
          <i class="fas fa-exclamation-circle me-2"></i>
          Failed to load upcoming classes
        </div>
      `;
    }
    throw error;
  }
}

function showLoadingStates() {
  const calendarEl = document.getElementById('scheduleCalendar');
  if (calendarEl) {
    calendarEl.innerHTML = `
      <div id="calendarLoading" class="d-flex justify-content-center align-items-center" style="height: 500px;">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading calendar...</span>
        </div>
      </div>
    `;
  }
}

function showErrorStates() {
  const calendarEl = document.getElementById('scheduleCalendar');
  const upcomingClasses = document.getElementById('upcomingClasses');
  
  if (calendarEl) {
    calendarEl.innerHTML = `
      <div class="d-flex justify-content-center align-items-center text-danger" style="height: 500px;">
        <div class="text-center">
          <i class="fas fa-calendar-times fa-3x mb-3"></i>
          <h5>Failed to load calendar</h5>
          <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.location.reload()">
            <i class="fas fa-sync-alt me-1"></i> Try Again
          </button>
        </div>
      </div>
    `;
  }
  
  if (upcomingClasses) {
    upcomingClasses.innerHTML = `
      <div class="list-group-item text-center py-4 text-danger">
        <i class="fas fa-exclamation-circle me-2"></i>
        Failed to load upcoming classes
      </div>
    `;
  }
}

function setUserInfo(user) {
  const nameElement = document.getElementById('studentName');
  const initialsElement = document.getElementById('studentInitials');
  
  if (nameElement) nameElement.textContent = user.name || 'Student';
  if (initialsElement) {
    initialsElement.textContent = user.name 
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
      : 'S';
  }
}

function formatDate(dateString) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function showErrorToast(message) {
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
}

// Make refresh available to error state button
window.reloadPage = function() {
  window.location.reload();
};