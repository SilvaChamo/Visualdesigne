import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Preços",
};

export default function PricingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
