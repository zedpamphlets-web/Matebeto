/** Help Center text. Customer-facing wording only. */
export type HelpArticle = { id: string; q: string; a: string };
export type HelpCategory = { id: string; title: string; articles: HelpArticle[] };

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "ordering",
    title: "Ordering",
    articles: [
      {
        id: "how-order",
        q: "How do I order food?",
        a: "Open Home and choose your market. Pick a food category, then a meal. Choose your sides, set the quantity and tap Add to basket. Open your basket, add your delivery details, choose bicycle or motorbike delivery, and pay. We take care of the rest.",
      },
      {
        id: "choose-vendor",
        q: "Why can't I choose the vendor?",
        a: "You choose the food and Matebeto chooses the vendor. We find a food partner in your market who can prepare your whole order, so you don't have to search or call around.",
      },
      {
        id: "sides-free",
        q: "Do sides cost extra?",
        a: "No. Sides are included in the price of the meal. If a meal is K85, your sides are already part of that K85.",
      },
      {
        id: "one-vendor",
        q: "Can one order come from different vendors?",
        a: "No. Each order comes from one market and one vendor, so your whole basket is prepared in one place and arrives together.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    articles: [
      {
        id: "how-pay",
        q: "How do I pay?",
        a: "You pay with mobile money (MTN, Airtel or Zamtel). Choose your provider, enter your mobile money number, then approve the payment on your phone with your PIN. Please don't close the app while the payment is processing.",
      },
      {
        id: "what-total",
        q: "What is in my total?",
        a: "Your total shows the Food Total, the Platform Fee and the Delivery Fee. That is the final price. There are no extra charges for sides.",
      },
      {
        id: "pay-failed",
        q: "What if my payment fails?",
        a: "You are not charged for a failed payment, and the order does not appear in your orders. You get a notification telling you the payment failed. Go back to your basket and try again.",
      },
      {
        id: "pay-nothing",
        q: "I paid but my order is not showing",
        a: "Open My Orders and pull down to refresh. Sometimes a payment takes a moment to confirm. If it still does not show, please contact support with your mobile money message.",
      },
    ],
  },
  {
    id: "delivery",
    title: "Delivery",
    articles: [
      {
        id: "track",
        q: "How do I track my order?",
        a: "Open My Orders and tap your order. You will see each step: order received, looking for a chef, chef confirmed, preparing your order, rider confirmed, order confirmed, rider coming and delivery complete. We also send notifications as things change.",
      },
      {
        id: "bike-moto",
        q: "Bicycle or motorbike?",
        a: "You choose the delivery type before paying. We only send the type you chose, so a bicycle order is delivered by a bicycle rider and a motorbike order by a motorbike rider.",
      },
      {
        id: "code",
        q: "What is the delivery code?",
        a: "When a rider is assigned, your order shows a delivery code. Give it to the rider only when your food arrives. The rider enters it in the app, and that is what completes your delivery. If the code is wrong, the delivery is not completed.",
      },
      {
        id: "not-home",
        q: "What if I am not available when the rider arrives?",
        a: "The rider will call or message you and wait about 10 minutes. If they still cannot reach you, they contact support. Without the correct code the delivery cannot be completed.",
      },
      {
        id: "no-vendor-rider",
        q: "No vendor or no rider was found",
        a: "You will get a notification saying we are still looking. Open the order and tap Try again, and we will search again. We also search again by ourselves when a new chef becomes available. If it still fails, you can cancel the order or contact support.",
      },
      {
        id: "cancel",
        q: "Can I cancel my order?",
        a: "You can cancel while we are still finding your food partner. Open your order and tap Cancel order. If you already paid, the amount is marked for a refund. After a vendor has accepted, please contact support.",
      },
    ],
  },
  {
    id: "riders",
    title: "Riders",
    articles: [
      {
        id: "rider-apply",
        q: "How do I become a rider?",
        a: "Open Profile and tap Become a rider. Enter your details, choose your vehicle (bicycle or motorbike), upload your ID and take a clear photo of your face. Then submit your application for review.",
      },
      {
        id: "rider-status",
        q: "What does my application status mean?",
        a: "Pending means we are reviewing it. Approved means you can start taking deliveries. Rejected means it was not approved and you can apply again. Suspended means your rider account is paused, so please contact support.",
      },
      {
        id: "rider-online",
        q: "How do I get delivery jobs?",
        a: "Once approved, open Rider mode and go online. You will get a notification when a delivery is offered to you. You can accept or decline it.",
      },
      {
        id: "rider-vendor",
        q: "How do I know which vendor to go to?",
        a: "After you accept a delivery, the job shows the vendor's name, their market and a Call vendor button. Use these details only to collect the order.",
      },
      {
        id: "rider-complete",
        q: "How do I complete a delivery?",
        a: "At the vendor, compare order numbers and type the number the vendor shows you to confirm pickup. At the customer, ask for their delivery code and enter it in the app. Earnings follow a delivery that has been verified with the code.",
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    articles: [
      {
        id: "acc-complete",
        q: "How do I complete my account?",
        a: "Open Profile, then Account. Add your name, the phone number the rider can call, your delivery location and your mobile money details, then tap Save.",
      },
      {
        id: "acc-notify",
        q: "I am not getting notifications",
        a: "Open your phone Settings, find Matebeto and make sure notifications are turned on, including the Orders channel. Then open the app once while signed in.",
      },
      {
        id: "acc-delete",
        q: "How do I delete my account?",
        a: "Open Profile, then Account, and scroll to the Danger zone. Tap Delete my account and enter your phone number to confirm. This deletes your data on Matebeto. You cannot delete while an order or refund is still in progress.",
      },
    ],
  },
];

export const POPULAR_IDS = ["how-order", "code", "pay-failed", "track"];

export function allArticles(): (HelpArticle & { category: string })[] {
  return HELP_CATEGORIES.flatMap((c) => c.articles.map((a) => ({ ...a, category: c.title })));
}
