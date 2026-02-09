/**
 * Root layout — wraps the entire app with HelloJohnProvider (client-side).
 */
import Providers from "./providers";

export const metadata = {
  title: "HelloJohn Next.js Example",
  description: "Next.js app with HelloJohn SSR authentication",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
