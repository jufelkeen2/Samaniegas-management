CREATE TABLE "ApplicationCredential" (
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApplicationCredential_pkey" PRIMARY KEY ("username")
);
