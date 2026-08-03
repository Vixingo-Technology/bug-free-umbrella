import { prisma } from "@/lib/prisma";
import type { ReportKey } from "./report-types";

export interface ReportFilters {
    from?: Date;
    to?: Date;
    dojoId?: string;
    userId?: string;
}

function dateWhere(from?: Date, to?: Date) {
    if (!from && !to) return undefined;
    const w: { gte?: Date; lte?: Date } = {};
    if (from) w.gte = from;
    if (to) w.lte = to;
    return w;
}

type Row = Record<string, unknown>;

function num(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    if (typeof v === "object" && v !== null && "toString" in v) return Number((v as { toString: () => string }).toString());
    return Number(v);
}

export async function generateReport(
    key: ReportKey,
    filters: ReportFilters,
): Promise<Row[]> {
    const { from, to, dojoId, userId } = filters;
    const createdAt = dateWhere(from, to);

    switch (key) {
        case "members": {
            const users = await prisma.user.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { id: userId } : {}),
                    ...(dojoId
                        ? {
                              OR: [
                                  { student: { dojoId } },
                                  { instructor: { dojoId } },
                                  { dojoManager: { dojoId } },
                                  { dojoOwner: { dojoId } },
                              ],
                          }
                        : {}),
                },
                include: {
                    student: { include: { dojo: { select: { name: true } } } },
                    instructor: { include: { dojo: { select: { name: true } } } },
                    dojoManager: { include: { dojo: { select: { name: true } } } },
                    dojoOwner: { include: { dojo: { select: { name: true } } } },
                },
                orderBy: { createdAt: "desc" },
            });
            return users.map((u) => ({
                id: u.id,
                member_number: u.memberNumber,
                full_name: u.fullName,
                email: u.email,
                phone: u.phone,
                role: u.roleId,
                is_active: u.isActive,
                dojo:
                    u.student?.dojo?.name ??
                    u.instructor?.dojo?.name ??
                    u.dojoManager?.dojo?.name ??
                    u.dojoOwner?.dojo?.name ??
                    "",
                current_rank: u.student?.currentRank ?? "",
                membership_status: u.student?.membershipStatus ?? "",
                created_at: u.createdAt,
            }));
        }

        case "students": {
            const rows = await prisma.student.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                    ...(userId ? { id: userId } : {}),
                },
                include: {
                    user: true,
                    dojo: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((s) => ({
                id: s.id,
                member_number: s.user.memberNumber,
                full_name: s.user.fullName,
                email: s.user.email,
                phone: s.user.phone,
                dojo: s.dojo?.name ?? "",
                current_rank: s.currentRank,
                membership_status: s.membershipStatus,
                join_stage: s.joinStage,
                join_date: s.joinDate,
                expiry_date: s.expiryDate,
                joined_at: s.joinedAt,
                onboarding_complete: s.onboardingComplete,
                requested_rank: s.requestedRank,
                assigned_rank: s.assignedRank,
                past_belt_fee_bdt: s.pastBeltFeeBDT,
                created_at: s.createdAt,
            }));
        }

        case "instructors": {
            const rows = await prisma.instructor.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                    ...(userId ? { id: userId } : {}),
                },
                include: { user: true, dojo: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((i) => ({
                id: i.id,
                full_name: i.user.fullName,
                email: i.user.email,
                phone: i.user.phone,
                dojo: i.dojo?.name ?? "",
                joined_date: i.joinedDate,
                bio: i.bio,
                is_active: i.user.isActive,
                created_at: i.createdAt,
            }));
        }

        case "dojo_managers": {
            const rows = await prisma.dojoManager.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                    ...(userId ? { id: userId } : {}),
                },
                include: { user: true, dojo: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((m) => ({
                id: m.id,
                full_name: m.user.fullName,
                email: m.user.email,
                phone: m.user.phone,
                dojo: m.dojo?.name ?? "",
                is_active: m.user.isActive,
                created_at: m.createdAt,
            }));
        }

        case "dojo_owners": {
            const rows = await prisma.dojoOwner.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                    ...(userId ? { id: userId } : {}),
                },
                include: { user: true, dojo: { select: { name: true } } },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((o) => ({
                id: o.id,
                full_name: o.user.fullName,
                email: o.user.email,
                phone: o.user.phone,
                dojo: o.dojo?.name ?? "",
                is_active: o.user.isActive,
                created_at: o.createdAt,
            }));
        }

        case "dojos": {
            const rows = await prisma.dojo.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { id: dojoId } : {}),
                },
                include: {
                    _count: { select: { students: true, instructors: true, managers: true } },
                    owner: { include: { user: { select: { fullName: true, email: true } } } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((d) => ({
                id: d.id,
                name: d.name,
                short_name: d.shortName,
                address: d.address,
                city: d.city,
                latitude: d.latitude,
                longitude: d.longitude,
                phone: d.phone,
                email: d.email,
                is_active: d.isActive,
                annual_fee: num(d.annualFee),
                expiry_date: d.expiryDate,
                student_count: d._count.students,
                instructor_count: d._count.instructors,
                manager_count: d._count.managers,
                owner_name: d.owner?.user.fullName ?? "",
                owner_email: d.owner?.user.email ?? "",
                created_at: d.createdAt,
            }));
        }

        case "dojo_applications": {
            const rows = await prisma.dojoApplication.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { userId } : {}),
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((a) => ({
                id: a.id,
                user_id: a.userId,
                dojo_name: a.dojoName,
                email: a.email,
                phone: a.phone,
                contact_name: a.contactName,
                contact_role: a.contactRole,
                contact_rank: a.contactRank,
                address: a.address,
                status: a.status,
                dojo_id: a.dojoId,
                created_at: a.createdAt,
            }));
        }

        case "gradings": {
            const rows = await prisma.grading.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { studentId: userId } : {}),
                    ...(dojoId ? { student: { dojoId } } : {}),
                },
                include: {
                    student: { include: { user: { select: { fullName: true, memberNumber: true } }, dojo: { select: { name: true } } } },
                    fromRank: { select: { name: true } },
                    toRank: { select: { name: true } },
                    gradingEvent: { select: { name: true, eventDate: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((g) => ({
                id: g.id,
                student_id: g.studentId,
                member_number: g.student.user.memberNumber,
                student_name: g.student.user.fullName,
                dojo: g.student.dojo?.name ?? "",
                from_rank: g.fromRank?.name ?? "",
                to_rank: g.toRank?.name ?? "",
                result: g.result,
                marks: g.marks,
                is_double_promotion: g.isDoublePromotion,
                pipeline_stage: g.pipelineStage,
                grading_event: g.gradingEvent?.name ?? "",
                event_date: g.gradingEvent?.eventDate ?? null,
                certificate_url: g.certificateUrl,
                notes: g.notes,
                created_at: g.createdAt,
            }));
        }

        case "grading_events": {
            const rows = await prisma.gradingEvent.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                },
                include: {
                    targetRank: { select: { name: true } },
                    _count: { select: { gradings: true, applications: true } },
                },
                orderBy: { eventDate: "desc" },
            });
            return rows.map((e) => ({
                id: e.id,
                name: e.name,
                event_date: e.eventDate,
                location: e.location,
                target_rank: e.targetRank?.name ?? "",
                is_open: e.isOpen,
                results_published_at: e.resultsPublishedAt,
                cancelled_at: e.cancelledAt,
                cancel_reason: e.cancelReason,
                application_count: e._count.applications,
                grading_count: e._count.gradings,
                created_at: e.createdAt,
            }));
        }

        case "grading_applications": {
            const rows = await prisma.gradingApplication.findMany({
                where: {
                    ...(createdAt ? { appliedAt: createdAt } : {}),
                    ...(userId ? { studentId: userId } : {}),
                    ...(dojoId ? { student: { dojoId } } : {}),
                },
                include: {
                    student: { include: { user: { select: { fullName: true, memberNumber: true } }, dojo: { select: { name: true } } } },
                    gradingEvent: { select: { name: true, eventDate: true } },
                    targetRank: { select: { name: true } },
                },
                orderBy: { appliedAt: "desc" },
            });
            return rows.map((a) => ({
                id: a.id,
                student_id: a.studentId,
                member_number: a.student.user.memberNumber,
                student_name: a.student.user.fullName,
                dojo: a.student.dojo?.name ?? "",
                grading_event: a.gradingEvent?.name ?? "",
                event_date: a.gradingEvent?.eventDate ?? null,
                target_rank: a.targetRank?.name ?? "",
                status: a.status,
                notes: a.notes,
                decline_reason: a.declineReason,
                applied_at: a.appliedAt,
            }));
        }

        case "certificate_requests": {
            const rows = await prisma.certificateRequest.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { studentId: userId } : {}),
                    ...(dojoId ? { dojoId } : {}),
                },
                include: {
                    student: { include: { user: { select: { memberNumber: true } } } },
                    dojo: { select: { name: true } },
                    grading: { select: { result: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((c) => ({
                id: c.id,
                order_id: c.orderId,
                grading_id: c.gradingId,
                student_id: c.studentId,
                member_number: c.student.user.memberNumber,
                member_name: c.memberName,
                father_name: c.fatherName,
                mother_name: c.motherName,
                rank_name: c.rankName,
                dojo: c.dojo.name,
                status: c.status,
                price: num(c.price),
                certificate_url: c.certificateUrl,
                failure_reason: c.failureReason,
                created_at: c.createdAt,
            }));
        }

        case "events": {
            const rows = await prisma.event.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                },
                include: {
                    dojo: { select: { name: true } },
                    postedBy: { select: { fullName: true } },
                    _count: { select: { registrations: true } },
                },
                orderBy: { eventDate: "desc" },
            });
            return rows.map((e) => ({
                id: e.id,
                title: e.title,
                category: e.category,
                event_date: e.eventDate,
                location: e.location,
                is_published: e.isPublished,
                is_premium: e.isPremium,
                ticket_price: num(e.ticketPrice),
                member_discount_percent: e.memberDiscountPercent,
                max_capacity: e.maxCapacity,
                participant_type: e.participantType,
                dojo: e.dojo?.name ?? "",
                posted_by: e.postedBy?.fullName ?? "",
                registration_count: e._count.registrations,
                created_at: e.createdAt,
            }));
        }

        case "event_registrations": {
            const rows = await prisma.eventRegistration.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { userId } : {}),
                },
                include: {
                    event: { select: { title: true, eventDate: true, category: true } },
                    user: { select: { fullName: true, email: true, phone: true, memberNumber: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((r) => ({
                id: r.id,
                event: r.event.title,
                event_category: r.event.category,
                event_date: r.event.eventDate,
                member_number: r.user?.memberNumber ?? "",
                full_name: r.user?.fullName ?? r.guestName ?? "",
                email: r.user?.email ?? r.guestEmail ?? "",
                phone: r.user?.phone ?? r.guestPhone ?? "",
                is_guest: !r.userId,
                payment_status: r.paymentStatus,
                amount_due: num(r.amountDue),
                paid_at: r.paidAt,
                transaction_id: r.transactionId,
                division_code: r.divisionCode,
                entrant_gender: r.entrantGender,
                entrant_weight_kg: num(r.entrantWeightKg),
                entrant_belt_rank: r.entrantBeltRank,
                entrant_dojo_name: r.entrantDojoName,
                coach_name: r.coachName,
                team_name: r.teamName,
                checked_in_at: r.checkedInAt,
                created_at: r.createdAt,
            }));
        }

        case "announcements": {
            const rows = await prisma.announcement.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                    ...(userId ? { postedById: userId } : {}),
                },
                include: {
                    dojo: { select: { name: true } },
                    postedBy: { select: { fullName: true } },
                },
                orderBy: { publishedAt: "desc" },
            });
            return rows.map((a) => ({
                id: a.id,
                title: a.title,
                body: a.body,
                is_published: a.isPublished,
                published_at: a.publishedAt,
                dojo: a.dojo?.name ?? "",
                posted_by: a.postedBy?.fullName ?? "",
                created_at: a.createdAt,
            }));
        }

        case "shop_products": {
            const rows = await prisma.shopProduct.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((p) => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: num(p.price),
                stock: p.stock,
                is_active: p.isActive,
                has_sizes: p.hasSizes,
                sizes: p.sizes.join("|"),
                member_discount_percent: p.memberDiscountPercent,
                created_at: p.createdAt,
            }));
        }

        case "shop_orders": {
            const rows = await prisma.shopOrder.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { userId } : {}),
                    ...(dojoId ? { OR: [{ dojoId }, { certDojoId: dojoId }] } : {}),
                },
                include: {
                    user: { select: { fullName: true, email: true, memberNumber: true } },
                    _count: { select: { orderItems: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((o) => ({
                id: o.id,
                user_id: o.userId,
                member_number: o.user?.memberNumber ?? "",
                full_name: o.user?.fullName ?? o.guestName ?? "",
                email: o.user?.email ?? o.guestEmail ?? "",
                is_guest_order: o.isGuestOrder,
                payment_status: o.paymentStatus,
                payment_method: o.paymentMethod,
                total: num(o.total),
                currency: o.currency,
                transaction_id: o.transactionId,
                fulfillment_status: o.fulfillmentStatus,
                includes_membership: o.includesMembership,
                includes_certificates: o.includesCertificates,
                includes_dojo_renewal: o.includesDojoRenewal,
                includes_transfer_request: o.includesTransferRequest,
                includes_service_request: o.includesServiceRequest,
                item_count: o._count.orderItems,
                created_at: o.createdAt,
            }));
        }

        case "shop_order_items": {
            const rows = await prisma.shopOrderItem.findMany({
                where: {
                    order: {
                        ...(createdAt ? { createdAt } : {}),
                    },
                },
                include: {
                    order: { select: { createdAt: true, userId: true, paymentStatus: true } },
                    product: { select: { name: true } },
                },
            });
            return rows.map((i) => ({
                order_id: i.orderId,
                product_id: i.productId,
                product_name: i.product.name,
                quantity: i.quantity,
                unit_price: num(i.unitPrice),
                size: i.size,
                order_status: i.order.paymentStatus,
                order_date: i.order.createdAt,
            }));
        }

        case "dojo_sales": {
            const rows = await prisma.dojoSale.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                    ...(userId ? { buyerUserId: userId } : {}),
                },
                include: {
                    dojo: { select: { name: true } },
                    _count: { select: { items: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((s) => ({
                id: s.id,
                receipt_no: s.receiptNo,
                dojo: s.dojo.name,
                buyer_name: s.buyerName,
                sold_by_name: s.soldByName,
                subtotal: num(s.subtotal),
                discount: num(s.discount),
                total: num(s.total),
                payment_method: s.paymentMethod,
                item_count: s._count.items,
                created_at: s.createdAt,
            }));
        }

        case "dojo_sale_items": {
            const rows = await prisma.dojoSaleItem.findMany({
                where: {
                    sale: {
                        ...(createdAt ? { createdAt } : {}),
                        ...(dojoId ? { dojoId } : {}),
                    },
                },
                include: {
                    sale: { include: { dojo: { select: { name: true } } } },
                },
            });
            return rows.map((i) => ({
                sale_id: i.saleId,
                receipt_no: i.sale.receiptNo,
                dojo: i.sale.dojo.name,
                product_id: i.productId,
                product_name: i.productName,
                quantity: i.quantity,
                unit_price: num(i.unitPrice),
                line_total: num(i.lineTotal),
                sale_date: i.sale.createdAt,
            }));
        }

        case "dojo_inventory": {
            const rows = await prisma.dojoInventoryItem.findMany({
                where: {
                    ...(dojoId ? { dojoId } : {}),
                },
                include: {
                    dojo: { select: { name: true } },
                    product: { select: { name: true, category: true } },
                },
            });
            return rows.map((i) => ({
                dojo: i.dojo.name,
                product: i.product.name,
                category: i.product.category,
                quantity_on_hand: i.quantityOnHand,
                unit_price: num(i.unitPrice),
                updated_at: i.updatedAt,
            }));
        }

        case "tournaments": {
            const rows = await prisma.tournament.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                },
                include: {
                    _count: { select: { participants: true, matches: true } },
                },
                orderBy: { date: "desc" },
            });
            return rows.map((t) => ({
                id: t.id,
                name: t.name,
                date: t.date,
                location: t.location,
                is_published: t.isPublished,
                participant_count: t._count.participants,
                match_count: t._count.matches,
                created_at: t.createdAt,
            }));
        }

        case "tournament_participants": {
            const rows = await prisma.tournamentParticipant.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { userId } : {}),
                },
                include: {
                    tournament: { select: { name: true, date: true } },
                    user: { select: { fullName: true, email: true, memberNumber: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((p) => ({
                id: p.id,
                tournament: p.tournament.name,
                tournament_date: p.tournament.date,
                member_number: p.user.memberNumber,
                full_name: p.user.fullName,
                email: p.user.email,
                category: p.category,
                weight_class: p.weightClass,
                created_at: p.createdAt,
            }));
        }

        case "tournament_matches": {
            const rows = await prisma.tournamentMatch.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                },
                include: {
                    tournament: { select: { name: true } },
                    participant1: { include: { user: { select: { fullName: true } } } },
                    participant2: { include: { user: { select: { fullName: true } } } },
                    winner: { include: { user: { select: { fullName: true } } } },
                },
            });
            return rows.map((m) => ({
                id: m.id,
                tournament: m.tournament.name,
                round: m.round,
                match_order: m.matchOrder,
                participant_1: m.participant1?.user.fullName ?? "",
                participant_2: m.participant2?.user.fullName ?? "",
                winner: m.winner?.user.fullName ?? "",
                notes: m.notes,
                created_at: m.createdAt,
            }));
        }

        case "achievements": {
            const rows = await prisma.achievement.findMany({
                orderBy: [{ tier: "asc" }, { orderIndex: "asc" }],
            });
            return rows.map((a) => ({
                id: a.id,
                slug: a.slug,
                name: a.name,
                description: a.description,
                icon: a.icon,
                tier: a.tier,
                rule: a.rule,
                threshold: a.threshold,
                is_active: a.isActive,
            }));
        }

        case "student_achievements": {
            const rows = await prisma.studentAchievement.findMany({
                where: {
                    ...(createdAt ? { unlockedAt: createdAt } : {}),
                    ...(userId ? { studentId: userId } : {}),
                },
                include: {
                    student: { include: { user: { select: { fullName: true, memberNumber: true } } } },
                    achievement: { select: { name: true, tier: true } },
                    awardedBy: { select: { fullName: true } },
                },
                orderBy: { unlockedAt: "desc" },
            });
            return rows.map((s) => ({
                id: s.id,
                member_number: s.student.user.memberNumber,
                student_name: s.student.user.fullName,
                achievement: s.achievement.name,
                tier: s.achievement.tier,
                progress: s.progress,
                awarded_by: s.awardedBy?.fullName ?? "",
                note: s.note,
                unlocked_at: s.unlockedAt,
            }));
        }

        case "transfer_requests": {
            const rows = await prisma.studentTransferRequest.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { studentId: userId } : {}),
                    ...(dojoId ? { OR: [{ fromDojoId: dojoId }, { toDojoId: dojoId }] } : {}),
                },
                include: {
                    student: { include: { user: { select: { fullName: true, memberNumber: true } } } },
                    fromDojo: { select: { name: true } },
                    toDojo: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((t) => ({
                id: t.id,
                member_number: t.student.user.memberNumber,
                student_name: t.student.user.fullName,
                from_dojo: t.fromDojo.name,
                to_dojo: t.toDojo.name,
                status: t.status,
                dojo_decision: t.dojoDecision,
                fee: num(t.fee),
                discount_amount: num(t.discountAmount),
                final_amount: num(t.finalAmount),
                coupon_code: t.couponCode,
                paid_at: t.paidAt,
                dojo_acted_at: t.dojoActedAt,
                admin_acted_at: t.adminActedAt,
                created_at: t.createdAt,
            }));
        }

        case "service_requests": {
            const rows = await prisma.serviceRequest.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { studentId: userId } : {}),
                    ...(dojoId ? { dojoId } : {}),
                },
                include: {
                    student: { include: { user: { select: { fullName: true, memberNumber: true } } } },
                    service: { select: { name: true } },
                    dojo: { select: { name: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((r) => ({
                id: r.id,
                service: r.service.name,
                member_number: r.student.user.memberNumber,
                student_name: r.student.user.fullName,
                dojo: r.dojo.name,
                status: r.status,
                dojo_decision: r.dojoDecision,
                fee: num(r.fee),
                discount_amount: num(r.discountAmount),
                final_amount: num(r.finalAmount),
                coupon_code: r.couponCode,
                paid_at: r.paidAt,
                dojo_acted_at: r.dojoActedAt,
                admin_acted_at: r.adminActedAt,
                created_at: r.createdAt,
            }));
        }

        case "services": {
            const rows = await prisma.service.findMany({
                orderBy: { createdAt: "desc" },
            });
            return rows.map((s) => ({
                id: s.id,
                slug: s.slug,
                name: s.name,
                description: s.description,
                fee_bdt: num(s.feeBDT),
                handler: s.handler,
                is_active: s.isActive,
                created_at: s.createdAt,
            }));
        }

        case "service_coupons": {
            const rows = await prisma.serviceCoupon.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(dojoId ? { dojoId } : {}),
                },
                include: {
                    dojo: { select: { name: true } },
                    service: { select: { name: true } },
                    createdBy: { select: { fullName: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((c) => ({
                id: c.id,
                code: c.code,
                dojo: c.dojo.name,
                service: c.service?.name ?? "ANY",
                discount_percent: c.discountPercent,
                usage_limit: c.usageLimit,
                used_count: c.usedCount,
                expires_at: c.expiresAt,
                is_active: c.isActive,
                created_by: c.createdBy.fullName,
                created_at: c.createdAt,
            }));
        }

        case "payment_transactions": {
            const rows = await prisma.paymentTransaction.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { userId } : {}),
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((t) => ({
                id: t.id,
                user_id: t.userId,
                order_id: t.orderId,
                event_registration_id: t.eventRegistrationId,
                provider: t.provider,
                kind: t.kind,
                status: t.status,
                amount: num(t.amount),
                currency: t.currency,
                gateway_txn_id: t.gatewayTxnId,
                buyer_name: t.buyerName,
                buyer_email: t.buyerEmail,
                buyer_phone: t.buyerPhone,
                reason: t.reason,
                created_at: t.createdAt,
            }));
        }

        case "notifications": {
            const rows = await prisma.notification.findMany({
                where: {
                    ...(createdAt ? { createdAt } : {}),
                    ...(userId ? { userId } : {}),
                },
                include: {
                    user: { select: { fullName: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
            });
            return rows.map((n) => ({
                id: n.id,
                user_id: n.userId,
                full_name: n.user.fullName,
                email: n.user.email,
                title: n.title,
                message: n.message,
                type: n.type,
                is_read: n.isRead,
                link: n.link,
                created_at: n.createdAt,
            }));
        }

        default:
            return [];
    }
}
