// The feed page locks body scroll (full-screen video surface); the admin
// needs its own scrollable viewport instead.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="fixed inset-0 overflow-y-auto">{children}</div>;
}
