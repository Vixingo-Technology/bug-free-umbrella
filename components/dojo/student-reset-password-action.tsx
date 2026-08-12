"use client";

import ResetPasswordButton from "@/components/auth/reset-password-button";
import { resetDojoMemberPasswordAction } from "@/app/actions/dojo-invite";

type Props = {
    memberId: string;
    memberName: string;
    dojoName: string | null;
};

export default function StudentResetPasswordAction({
    memberId,
    memberName,
    dojoName,
}: Props) {
    return (
        <ResetPasswordButton
            targetName={memberName}
            targetSubtitle={dojoName ? `Student · ${dojoName}` : "Student"}
            onConfirm={async (manual) => {
                const fd = new FormData();
                fd.set("memberId", memberId);
                if (manual) fd.set("manualPassword", manual);
                return resetDojoMemberPasswordAction(fd);
            }}
        />
    );
}
