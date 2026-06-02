import LegalPage from './LegalPage';

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="This policy explains how AI Personal Task Manager collects, uses, and protects information when you use the app."
      updatedAt="June 2, 2026"
    >
      <section>
        <h2>Information We Collect</h2>
        <p>
          We collect account information such as name, email address, profile photo, phone number, authentication details, task data,
          calendar connection data, notification preferences, team collaboration data, and messages you send to the AI assistant or
          connected messaging integrations.
        </p>
      </section>

      <section>
        <h2>How We Use Information</h2>
        <p>
          We use your information to create and manage tasks, support login and registration, sync calendar events, provide reminders,
          process natural language task requests, support team collaboration, and maintain app security and reliability.
        </p>
      </section>

      <section>
        <h2>Meta And Third-Party Login Data</h2>
        <p>
          If you use a Meta-related feature or connected messaging service, we only use the information received from that service to
          authenticate you, link your account, receive your messages, create requested tasks, and send confirmations or support replies.
        </p>
      </section>

      <section>
        <h2>Data Sharing</h2>
        <p>
          We do not sell your personal data. We may share limited information with service providers needed to operate the app, such as
          hosting, authentication, calendar APIs, messaging APIs, analytics, and database services. These services are used only to
          deliver the app functionality.
        </p>
      </section>

      <section>
        <h2>Data Security</h2>
        <p>
          We use reasonable technical and organizational safeguards to protect your information. However, no online service can guarantee
          absolute security, so you should protect your account credentials and avoid sharing sensitive information in task messages.
        </p>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>
          We keep your information for as long as your account is active or as needed to provide the service. You may request deletion of
          your account and related data using the data deletion instructions page.
        </p>
      </section>

      <section>
        <h2>Your Choices</h2>
        <p>
          You can update profile information, disconnect integrations, delete tasks, and request deletion of your app data. You can also
          revoke third-party permissions from the relevant provider account settings.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For privacy questions or deletion requests, contact the AI Personal Task Manager project owner through the support contact
          provided in the app or repository.
        </p>
      </section>
    </LegalPage>
  );
}
