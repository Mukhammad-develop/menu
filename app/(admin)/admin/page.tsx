import { redirect } from 'next/navigation';
import {
  getAllMenuItems,
  getCategories,
  isDemoMode,
} from '@/lib/data';
import { deleteMenuItem, logout } from '@/app/actions';
import MenuItemForm from '@/components/MenuItemForm';

// Access is enforced by middleware.ts (menu_admin cookie).
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [categories, items] = await Promise.all([
    getCategories(),
    getAllMenuItems(),
  ]);
  const demo = isDemoMode();

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6 pb-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Админ-панель</h1>
        <form
          action={async () => {
            'use server';
            await logout();
            redirect('/admin/login');
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10"
          >
            Выйти
          </button>
        </form>
      </header>

      {demo && (
        <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
          Демо-режим: база данных не подключена (DATABASE_URL не задан).
          Данные ниже доступны только для чтения — установите DATABASE_URL,
          чтобы включить редактирование.
        </p>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <details>
          <summary className="cursor-pointer text-lg font-semibold text-neon">
            + Добавить блюдо
          </summary>
          <div className="mt-4">
            <MenuItemForm categories={categories} />
          </div>
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Блюда ({items.length})</h2>
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{item.title}</h3>
                  {!item.active && (
                    <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs text-white/50">
                      скрыто
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/60">
                  {item.category.name} ·{' '}
                  <span className="text-neon">
                    {new Intl.NumberFormat('ru-RU').format(item.price)} ₽
                  </span>
                </p>
              </div>
              <form
                action={async () => {
                  'use server';
                  await deleteMenuItem(item.id);
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Удалить
                </button>
              </form>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-white/60 hover:text-white">
                Редактировать
              </summary>
              <div className="mt-4">
                <MenuItemForm categories={categories} item={item} />
              </div>
            </details>
          </article>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-white/50">Пока нет ни одного блюда.</p>
        )}
      </section>
    </main>
  );
}
