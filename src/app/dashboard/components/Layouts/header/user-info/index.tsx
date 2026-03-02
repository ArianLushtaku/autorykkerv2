"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; full_name?: string; company_name?: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get user info from backend
    const getUser = async () => {
      try {
        console.log('[UserInfo] Fetching user data...');
        const result = await apiClient.checkAuthAndSubscription();
        console.log('[UserInfo] Auth result:', result);
        if (result.authenticated) {
          console.log('[UserInfo] User data:', result.user);
          setUser({
            id: result.user.id,
            email: '', // Email not returned from this endpoint
            full_name: result.user.full_name || undefined,
            company_name: result.user.company_name || undefined,
            avatar_url: result.user.avatar_url || undefined,
          });
        } else {
          console.log('[UserInfo] Not authenticated, redirecting to login');
          router.push('/login');
        }
      } catch (error) {
        console.error('[UserInfo] Failed to get user:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [router]);

  const handleSignOut = async () => {
    await apiClient.logout();
    setIsOpen(false);
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse max-[1024px]:hidden"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Link href="/login" className="text-sm font-medium text-primary hover:underline">
        Log ind
      </Link>
    );
  }

  const displayName = user.full_name || user.email?.split('@')[0] || 'Bruger';
  const avatarUrl = user.avatar_url || '/images/user/default-avatar.png';

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">Min Konto</span>

        <figure className="flex items-center gap-3">
          <Image
            src={avatarUrl}
            className="size-12 rounded-full object-cover"
            alt={`Avatar af ${displayName}`}
            role="presentation"
            width={48}
            height={48}
          />
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{displayName}</span>

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">Brugerinformation</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <Image
            src={avatarUrl}
            className="size-12 rounded-full object-cover"
            alt={`Avatar for ${displayName}`}
            role="presentation"
            width={48}
            height={48}
          />

          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {displayName}
            </div>

            <div className="leading-none text-gray-6">{user.email}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href={"/dashboard/profil"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />

            <span className="mr-auto text-base font-medium">Se profil</span>
          </Link>

          <Link
            href={"/dashboard/indstillinger"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />

            <span className="mr-auto text-base font-medium">
              Kontoindstillinger
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={handleSignOut}
          >
            <LogOutIcon />

            <span className="text-base font-medium">Log ud</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
