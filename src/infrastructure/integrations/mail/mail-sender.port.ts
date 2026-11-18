// Sending one email (integration-ports plan I1). Business modules inject this
// port, never the mail library; which adapter runs is chosen by MAIL_DRIVER.
export interface MailMessageInput {
  to: string
  subject: string
  // file name in src/infrastructure/integrations/mail/templates, without .hbs
  template: string
  context: Record<string, unknown>
}

export abstract class MailSender {
  // Rejects when the mail could not be handed to the provider
  abstract send(message: MailMessageInput): Promise<void>
}
