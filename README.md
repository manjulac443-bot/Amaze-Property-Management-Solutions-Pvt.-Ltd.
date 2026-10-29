# On-site Recruitment Biodata Form

This is a self-contained static HTML application. Its CSS and JavaScript are embedded in `index.html`; it has no Python or server runtime. Form submissions go directly from the browser to the Google Apps Script web app, and the browser generates the downloadable PDF.

## Run the page

Open `index.html` in a browser, or serve it with a static web host. For GitHub, enable **Settings → Pages** and use the published GitHub Pages URL. The GitHub repository file preview and `raw.githubusercontent.com` show source rather than running the web app. The Apps Script web app URL is configured in the inline JavaScript in `index.html`.

## Connect Google Sheets

1. Open the [biodata spreadsheet](https://docs.google.com/spreadsheets/d/1zb4gbbTeS_iQhaIupQN8k_COBpejDw4F1AllcHxzXCU/edit).
2. Select **Extensions → Apps Script**, replace the editor contents with `google_apps_script.gs`, and save.
3. Deploy or update a **Web app** deployment. Select **Execute as: Me** and grant access to the intended form users.
4. If the deployment URL changes, update `APPS_SCRIPT_URL` in the inline JavaScript near the end of `index.html`.
5. Reload the hosted form and submit a test entry.

The script writes all form text and checkbox values to a sheet row, creates bold column titles in the first row, and freezes that header row. A photo is optional: it appears at the top of the form and in the downloaded PDF, but is not sent to or recorded in the spreadsheet. Submitting adds one sheet row, starts one PDF download, and displays a named confirmation popup with a download link if the browser blocks automatic downloads. Required fields and phone numbers are validated before saving.
