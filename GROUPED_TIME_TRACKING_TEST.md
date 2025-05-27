# Grouped Time Tracking - Test Scenarios

## Test Environment

- Application URL: http://localhost:5174
- Feature Location: Time Dashboard → Group Tracking tab

## ⚠️ Known Issue Fixed

**Fixed Firestore Error**: Previously encountered "Function addDoc() called with invalid data. Unsupported field value: undefined" error has been resolved by properly handling optional parameters in the `startTimeEntry` function.

## Test Scenarios

### 1. Basic Group Time Tracking

**Objective**: Verify that multiple orders can be tracked simultaneously in a group

**Steps**:

1. Navigate to Time Dashboard page
2. Click on "Group Tracking" tab (tab 1)
3. Review the tutorial in GroupedTimeTrackingDemo section
4. In GroupedTimeTrackingWidget:
   - Select 2-3 orders from the dropdown
   - Add some notes (e.g., "Testing group functionality")
   - Click "Start Group Tracking"
5. Verify that:
   - Success message appears
   - Selected orders are cleared
   - Active group session appears with real-time timer
   - All selected orders show as chips in the active group

**Expected Results**:

- Group tracking starts successfully
- Timer displays and increments in real-time
- Group status shows as "Active"
- Individual order chips are displayed

### 2. Group Controls Testing

**Objective**: Test pause, resume, and stop functionality for grouped sessions

**Steps**:

1. With an active group session from Test 1:
   - Click "Pause Group" button
   - Verify timer stops and status changes to "Paused"
   - Click "Resume Group" button
   - Verify timer resumes and status changes to "Active"
   - Click "Stop Group" button
   - Enter stop notes in dialog
   - Confirm stopping

**Expected Results**:

- Pause/Resume works correctly
- Timer stops/starts appropriately
- Status indicators update correctly
- Stop dialog appears and processes successfully

### 3. Data Integration Testing

**Objective**: Verify that grouped tracking integrates with other time tracking views

**Steps**:

1. After completing a group session:
   - Check "History" tab to see if individual entries appear
   - Check "Active Sessions" tab during active tracking
   - Verify GroupedTimeEntriesSummary shows completed group
   - Check that refresh callbacks work across tabs

**Expected Results**:

- Individual time entries appear in History tab
- Active sessions show during tracking
- Historical grouped entries display in summary
- Data refreshes consistently across all tabs

### 4. Error Handling Testing

**Objective**: Verify proper error handling and validation

**Steps**:

1. Try starting group tracking without selecting orders
2. Try with invalid/non-existent orders
3. Test error recovery and message display

**Expected Results**:

- Appropriate error messages display
- System remains stable
- User can recover from error states

### 5. Multi-User Testing (if possible)

**Objective**: Verify grouped tracking works correctly in multi-user environment

**Steps**:

1. Have different users track time simultaneously
2. Verify user isolation and data integrity

**Expected Results**:

- Users only see their own grouped sessions
- No data interference between users

## Test Data Requirements

- At least 3 orders in "In Progress", "Released", or "Started" status
- Valid user authentication
- Working Firestore connection

## Success Criteria

- All basic functionality works without errors
- Real-time updates function correctly
- Data persistence works properly
- UI is responsive and user-friendly
- Integration with existing time tracking is seamless

## Issues to Watch For

- Timer accuracy and synchronization
- Memory leaks from timer intervals
- Data consistency across components
- Performance with multiple active groups
- Network error handling

## Browser Testing

Test in:

- Chrome (primary)
- Firefox
- Safari (if available)
- Mobile browsers (responsive design)
