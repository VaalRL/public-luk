export function generateNotificationMessage(
    template: string,
    data: {
        amount?: number;
        invoiceNumber?: string;
        companyName?: string;
        date?: Date;
    }
): string {
    let message = template;

    if (data.amount !== undefined) {
        message = message.replace(/\{amount\}/g, data.amount.toLocaleString());
    }
    if (data.invoiceNumber) {
        message = message.replace(/\{invoiceNumber\}/g, data.invoiceNumber);
    }
    if (data.companyName) {
        message = message.replace(/\{companyName\}/g, data.companyName);
    }
    if (data.date) {
        const dateStr = new Date(data.date).toLocaleDateString('zh-TW');
        message = message.replace(/\{date\}/g, dateStr);
    }

    return message;
}
