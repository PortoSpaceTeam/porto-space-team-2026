"use client";

import { useIntlayer } from "next-intlayer";
import { useState, useTransition, useOptimistic } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Check, X, Mail, MailX, Calendar, Building2 } from "lucide-react";
import type { User } from "@/lib/actions/users";
import { approveUser, rejectUser } from "@/lib/actions/users";

type OptimisticAction =
  | { type: "approve"; userId: string }
  | { type: "reject"; userId: string };

interface PendingUsersListProps {
  initialUsers: User[];
}

export function PendingUsersList({ initialUsers }: PendingUsersListProps) {
  const content = useIntlayer("admin-approvals-page");
  const [isPending, startTransition] = useTransition();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [userToReject, setUserToReject] = useState<User | null>(null);

  const [optimisticUsers, addOptimisticUpdate] = useOptimistic(
    initialUsers,
    (state: User[], action: OptimisticAction) => {
      return state.filter((user) => user.id !== action.userId);
    }
  );

  const handleApprove = (user: User) => {
    startTransition(async () => {
      addOptimisticUpdate({ type: "approve", userId: user.id });
      const result = await approveUser(user.id);
      if (result.success) {
        toast.success(content.toast.approveSuccess.value);
      } else {
        toast.error(content.toast.error.value);
      }
    });
  };

  const handleReject = () => {
    if (!userToReject) return;
    const userId = userToReject.id;
    setRejectDialogOpen(false);
    setUserToReject(null);

    startTransition(async () => {
      addOptimisticUpdate({ type: "reject", userId });
      const result = await rejectUser(userId);
      if (result.success) {
        toast.success(content.toast.rejectSuccess.value);
      } else {
        toast.error(content.toast.error.value);
      }
    });
  };

  const getDepartmentLabel = (dept: string) => {
    return (
      content.departments[dept as keyof typeof content.departments] ?? dept
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (optimisticUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
          <Check className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">
          {content.emptyState.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {content.emptyState.description}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {optimisticUsers.map((user) => (
          <Card
            key={user.id}
            className={`transition-opacity ${isPending ? "opacity-70" : ""}`}
          >
            <CardContent >
              <div className="flex items-start gap-4">
                <Avatar className="size-12">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold leading-none truncate">{user.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {content.card.department}:
                  </span>
                  <Badge variant="secondary">
                    {getDepartmentLabel(user.department)}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {content.card.requestedOn}:
                  </span>
                  <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {user.emailVerified ? (
                    <>
                      <Mail className="size-4 text-green-600" />
                      <span className="text-green-600">
                        {content.card.emailVerified}
                      </span>
                    </>
                  ) : (
                    <>
                      <MailX className="size-4 text-amber-600" />
                      <span className="text-amber-600">
                        {content.card.emailNotVerified}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className="gap-2">
              <Button
                className="flex-1"
                onClick={() => handleApprove(user)}
                disabled={isPending}
              >
                <Check className="mr-2 size-4" />
                {content.actions.approve}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setUserToReject(user);
                  setRejectDialogOpen(true);
                }}
                disabled={isPending}
              >
                <X className="mr-2 size-4" />
                {content.actions.reject}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{content.confirmReject.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {content.confirmReject.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{content.confirmReject.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {content.confirmReject.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
