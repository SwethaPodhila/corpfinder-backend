import { PLAN_CONFIG } from "./planConfig.js";

export const activatePlan = async (user, planName) => {
    try {
        const plan = PLAN_CONFIG[planName];

        if (!plan) {
            throw new Error("Invalid plan: " + planName);
        }

        const now = new Date();

        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + plan.durationDays);

        user.planName = planName;
        user.planStartDate = now;
        user.planEndDate = endDate;
        user.credits = plan.credits;

        await user.save();

        console.log("✅ PLAN UPDATED:", {
            planName,
            credits: plan.credits,
            start: now,
            end: endDate
        });

    } catch (err) {
        console.log("❌ activatePlan error:", err.message);
        throw err;
    }
};