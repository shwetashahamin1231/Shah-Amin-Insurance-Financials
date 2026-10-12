# Connecting the website forms to Google Sheets

The website has two forms that save straight into Google Sheets:

| Form | Where it is | Script to paste | Tab it creates | Goes in `src/config/forms.ts` as |
|---|---|---|---|---|
| **Appointment requests** | Book an Appointment page (`/book/`) | `apps-script/bookings/Code.gs` | `Bookings` | `bookings` |
| **Event RSVPs** | Each event page | `apps-script/rsvps/Code.gs` | `RSVPs` | `rsvps` |

It works the same way as your existing registration form. Allow about 10 minutes per form. You only need a Google account; no coding.

> **Use two separate spreadsheets**, one per form. The two scripts use the same function names, so they can't share one Apps Script project.

---

## Part 1 · Set up the appointment-requests sheet

### 1. Create the spreadsheet
1. Go to [sheets.google.com](https://sheets.google.com) and click **Blank spreadsheet**.
2. Click the title "Untitled spreadsheet" (top left) and name it, for example **Shah & Amin — Appointment requests**.

### 2. Open the script editor
1. In the menu, click **Extensions → Apps Script**. A new tab opens.
2. Click the project name "Untitled project" (top left) and rename it, for example **Bookings form**.

### 3. Paste the code
1. In the editor you'll see a file called `Code.gs` with a few lines of sample code. Select all of it and delete it.
2. Open `apps-script/bookings/Code.gs` from the website files, copy **everything**, and paste it into the editor.
3. Click the **Save** icon (the floppy disk) or press Ctrl+S (⌘S on a Mac).

### 4. Run `setup` once and approve access
1. In the toolbar, find the drop-down list of functions and choose **setup**.
2. Click **▶ Run**.
3. Google asks for permission. Click **Review permissions**, then choose your Google account.
4. You may see **"Google hasn't verified this app"**. That's normal for your own scripts. Click **Advanced**, then **Go to Bookings form (unsafe)**, then **Allow**.
5. Go back to the spreadsheet tab. You should now see a **Bookings** tab with a dark green header row: Timestamp, Name, Email, Phone, Date, Time (ET), Advisor, Topic, Meeting type, Message, Page.

### 5. Publish it as a web app
1. In the Apps Script tab, click **Deploy → New deployment** (top right).
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in:
   - **Description:** `Website form`
   - **Execute as:** **Me** (your email address)
   - **Who has access:** **Anyone**. Pick plain "Anyone", not "Anyone with Google account", or visitors won't be able to send the form.
4. Click **Deploy**. If Google asks for permission again, approve it the same way as in step 4.
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec` and must end in **/exec**.

### 6. Put the address into the website
1. Open `src/config/forms.ts`.
2. Paste the URL between the quotes on the `bookings:` line:
   ```ts
   bookings: 'https://script.google.com/macros/s/AKfy…/exec',
   ```
3. Save the file.

---

## Part 2 · Set up the RSVP sheet

Repeat **all of Part 1** with these changes:

- Name the spreadsheet something like **Shah & Amin — Event RSVPs**, and the script project **RSVP form**.
- In step 3, paste **`apps-script/rsvps/Code.gs`** instead.
- After step 4 you'll see an **RSVPs** tab: Timestamp, Event, Event date, Name, Email, Phone, Guests, Notes, Page.
- In step 6, paste the URL on the **`rsvps:`** line.

---

## Part 3 · Publish the site and test

1. **Rebuild and publish the website** the usual way (for example, push the change to GitHub so the site redeploys). The new addresses go live only when the site is rebuilt.
2. On the live site, send a test appointment request and a test RSVP, using your own details.
3. Check that a new row appears in each spreadsheet, then delete the test rows.

**Get an email for every new request (recommended):** in each spreadsheet, click **Tools → Notification settings → Edit notifications**, choose **Any changes are made** and **Email – right away**, then **Save**. The Google Sheets phone app works too.

---

## Changing a script later

If you (or your web developer) edit `Code.gs`:

1. Paste the new code into the Apps Script editor and **Save**.
2. Click **Deploy → Manage deployments**.
3. Select your existing deployment and click the **pencil (✎ Edit)** icon.
4. Under **Version**, choose **New version**, then click **Deploy**.

This keeps **the same /exec address**, so the website doesn't need to change.

> Don't use **New deployment** for updates. It creates a *different* address, and the website would keep sending to the old version. If you ever do, paste the new address into `src/config/forms.ts` and rebuild the site.

---

## Troubleshooting

| What you see | What to check |
|---|---|
| The form says **"Online booking isn't connected yet"** (or "Online RSVP…") | The address in `src/config/forms.ts` is still empty, or the site hasn't been rebuilt since you added it. |
| The form says **"Sorry — we couldn't send that just now"** | In **Deploy → Manage deployments**, check that *Who has access* is **Anyone** and that the address ends in **/exec** (not /dev). If you edited the code, publish a **New version** (see above). |
| Nothing arrives and there's no error | In the Apps Script editor, open **Executions** (the ▶☰ icon on the left) to see recent runs and any error messages. |
| You renamed the **Bookings** or **RSVPs** tab | The script makes a fresh tab with the original name on the next submission. Rename it back, or move your rows into the new tab. |
| Odd-looking or junk entries | The forms already block simple spam (a hidden "website" field and checks on every entry). If junk keeps getting through, ask your web developer. |

### Good to know
- **Privacy:** these spreadsheets hold visitors' names, emails and phone numbers. Share them only with people who need them.
- **The /exec address is public.** It's visible in the website's code, which is normal. It can only *add* rows; nobody can read your sheet through it.
- **Times** are recorded in Eastern Time exactly as the visitor chose them (e.g. "11:30 AM ET"). The *Timestamp* column shows when the request arrived, in your spreadsheet's time zone (**File → Settings**).
- **Appointment requests aren't confirmed bookings.** The website tells visitors you'll call or email to confirm.
