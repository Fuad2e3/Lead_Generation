# Fix User Credit Counting and UI Synchronization

The user reported that the credit count is not working correctly. I have identified several issues in both `index.html` and `dev/app.src.js` that cause UI desynchronization and potential silent failures in credit deduction.

## Proposed Changes

### [Component] Frontend (UI & Logic)

#### [MODIFY] [index.html](file:///C:/Users/fuadk/Downloads/Office/Lead_Generation/index.html)
- Expose `currentUserCredits` to the `window` object to allow `app.src.js` to access and update it.
- Ensure initial sync updates the global state correctly.

#### [MODIFY] [app.src.js](file:///C:/Users/fuadk/Downloads/Office/Lead_Generation/dev/app.src.js)
- Fix the credit deduction logic to strictly stop mining if the API call fails or returns an error (even with non-200 status codes like 403).
- Update the global `window.currentUserCredits` object after a successful deduction to keep the UI in sync without requiring a page refresh.
- Use the correct total daily credits from the global state instead of defaulting to 50 when updating the UI.

### [Component] Backend (API)

#### [MODIFY] [authController.js](file:///C:/Users/fuadk/Downloads/Office/Lead_Generation/dev/API/controllers/authController.js)
- Add more robust logging to `deductCredits` to help track deduction events in the server logs.

## Verification Plan

### Automated Tests
- Not applicable for this environment, but I will verify the logic changes manually by reviewing the code.

### Manual Verification
1. Log in to the app.
2. Start a mining session with a known number of URLs.
3. Verify that credits are deducted and the UI (badge and progress bar) updates correctly.
4. Verify that if credits are insufficient, an alert is shown and mining does not start.
5. Verify that the "total credits" displayed in the UI matches the user's actual package limit (e.g., 1000 for PRO).
