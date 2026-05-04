import { PLAN_CONFIG } from "./planConfig.js";

export const activatePlan = async (user, planName) => {
    const plan = PLAN_CONFIG[planName];

    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + plan.durationDays);

    user.planName = planName;
    user.planStartDate = now;
    user.planEndDate = endDate;

    user.credits = plan.credits;

    await user.save();
};