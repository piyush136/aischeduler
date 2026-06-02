import LegalPage from './LegalPage';

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="These terms describe the rules for using AI Personal Task Manager."
      updatedAt="June 2, 2026"
    >
      <section>
        <h2>Acceptance Of Terms</h2>
        <p>
          By using AI Personal Task Manager, you agree to these terms. If you do not agree, please do not use the app.
        </p>
      </section>

      <section>
        <h2>Service Description</h2>
        <p>
          AI Personal Task Manager helps users create, organize, schedule, and collaborate on tasks. The app may include AI-assisted
          natural language task creation, calendar sync, notifications, team workspaces, and messaging integrations.
        </p>
      </section>

      <section>
        <h2>User Responsibilities</h2>
        <p>
          You are responsible for keeping your login credentials secure, providing accurate account information, and using the app in a
          lawful and respectful way. Do not use the service to send abusive, illegal, harmful, or unauthorized content.
        </p>
      </section>

      <section>
        <h2>Third-Party Services</h2>
        <p>
          The app may connect to third-party services such as Google Calendar, Meta, WhatsApp Cloud API, Telegram, hosting providers, and
          analytics tools. Your use of those services may also be governed by their own terms and policies.
        </p>
      </section>

      <section>
        <h2>AI-Generated Output</h2>
        <p>
          AI-assisted task creation may interpret your messages and generate task details. You should review important tasks, dates,
          reminders, and schedules for accuracy before relying on them.
        </p>
      </section>

      <section>
        <h2>Availability</h2>
        <p>
          We aim to keep the app reliable, but we do not guarantee uninterrupted or error-free service. Features may change, pause, or be
          removed as the project evolves.
        </p>
      </section>

      <section>
        <h2>Limitation Of Liability</h2>
        <p>
          The app is provided on an as-is basis. To the maximum extent permitted by law, the project owner is not responsible for indirect
          losses, missed reminders, scheduling mistakes, data loss, or service interruptions.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          For terms-related questions, contact the AI Personal Task Manager project owner through the support contact provided in the app
          or repository.
        </p>
      </section>
    </LegalPage>
  );
}
