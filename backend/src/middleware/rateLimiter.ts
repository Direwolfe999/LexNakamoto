import rateLimit from 'express-rate-limit';

export const sponsorRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 5, 
    message: { error: "Gas quota exceeded. Please try again in an hour." },
    standardHeaders: true, 
    legacyHeaders: false, 
});
