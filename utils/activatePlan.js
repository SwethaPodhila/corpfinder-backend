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

        // =========================
        // UPDATE PLAN INFO
        // =========================

        user.planName = planName;
        user.planStartDate = now;
        user.planEndDate = endDate;

        // =========================
        // ADD CREDITS (NOT RESET)
        // =========================

        user.credits = (user.credits || 0) + plan.credits;

        await user.save();

        console.log("✅ PLAN UPDATED:", {
            planName,
            addedCredits: plan.credits,
            totalCredits: user.credits,
            start: now,
            end: endDate
        });

    } catch (err) {
        console.log("❌ activatePlan error:", err.message);
        throw err;
    }
};