import LegalPage from './LegalPage';

export default function DataDeletion() {
  return (
    <LegalPage
      title="User Data Deletion"
      subtitle="Use these instructions to request deletion of your AI Personal Task Manager account data."
      updatedAt="June 2, 2026"
    >
      <section>
        <h2>How To Request Data Deletion</h2>
        <p>
          To delete your account data, send a deletion request to the AI Personal Task Manager project owner through the support contact
          provided in the app or repository. Include the email address used for your account and mention that you want your app data
          deleted.
        </p>
      </section>

      <section>
        <h2>What Will Be Deleted</h2>
        <p>
          We will delete or anonymize account profile data, personal tasks, reminders, notifications, integration link records, calendar
          connection data stored by the app, and team data that belongs to your account where deletion is technically and legally possible.
        </p>
      </section>

      <section>
        <h2>Third-Party Permissions</h2>
        <p>
          You should also revoke app permissions from third-party accounts you connected, such as Google, Meta, WhatsApp, or Telegram.
          Revoking permissions from those providers helps stop future access from their side.
        </p>
      </section>

      <section>
        <h2>Processing Time</h2>
        <p>
          Deletion requests are normally processed within a reasonable period after verification. We may ask for confirmation to make sure
          the request belongs to the correct account owner.
        </p>
      </section>

      <section>
        <h2>Meta Data Deletion Callback Alternative</h2>
        <p>
          If Meta asks for a user data deletion instructions URL, use this page URL. It explains how users can request deletion of data
          associated with their app account and connected Meta-related features.
        </p>
      </section>
    </LegalPage>
  );
}
