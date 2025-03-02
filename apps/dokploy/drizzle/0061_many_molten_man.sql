ALTER TABLE "admin" ADD COLUMN "enablePaidFeatures" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin" ADD COLUMN "metricsConfig" jsonb DEFAULT '{"server":{"refreshRate":20,"port":4500,"token":"","retentionDays":2,"cronJob":"","urlCallback":"","thresholds":{"cpu":0,"memory":0}},"containers":{"refreshRate":20,"services":{"include":[],"exclude":[]}}}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notification" ADD COLUMN "serverThreshold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "server" ADD COLUMN "metricsConfig" jsonb DEFAULT '{"server":{"refreshRate":20,"port":4500,"token":"","urlCallback":"","cronJob":"","retentionDays":2,"thresholds":{"cpu":0,"memory":0}},"containers":{"refreshRate":20,"services":{"include":[],"exclude":[]}}}'::jsonb NOT NULL;