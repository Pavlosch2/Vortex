import time
import requests
from django.conf import settings

VIRUSTOTAL_API_KEY = getattr(settings, "VIRUS_TOTAL_API_KEY", "")
import logging
logging.getLogger(__name__).warning(f"[VirusTotal] API key loaded: '{VIRUSTOTAL_API_KEY[:6]}...' len={len(VIRUSTOTAL_API_KEY)}")
VT_BASE = "https://www.virustotal.com/api/v3"


def scan_file_virustotal(file_path):
    """
    Відправляє файл на VirusTotal і повертає результат.
    Повертає dict: {status, engines_total, engines_detected, scan_id, details}
    """
    headers = {"x-apikey": VIRUSTOTAL_API_KEY}

    import hashlib
    with open(file_path, "rb") as f:
        file_bytes = f.read()
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Спочатку перевіряємо чи файл вже є у VirusTotal
    existing = requests.get(
        f"{VT_BASE}/files/{file_hash}",
        headers=headers,
        timeout=30,
    )
    if existing.status_code == 200:
        data = existing.json()["data"]
        stats = data["attributes"]["last_analysis_stats"]
        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        total = sum(stats.values())
        detected = malicious + suspicious
        if malicious >= 5:
            status = "dangerous"
        elif malicious > 0 or suspicious > 0:
            status = "suspicious"
        else:
            status = "clean"
        return {
            "status": status,
            "engines_total": total,
            "engines_detected": detected,
            "scan_id": data["id"],
            "details": stats,
        }

    upload_resp = requests.post(
        f"{VT_BASE}/files",
        headers=headers,
        files={"file": (file_path, file_bytes)},
        timeout=60,
    )
    upload_resp.raise_for_status()
    analysis_id = upload_resp.json()["data"]["id"]

    for _ in range(20):
        time.sleep(5)
        analysis_resp = requests.get(
            f"{VT_BASE}/analyses/{analysis_id}",
            headers=headers,
            timeout=30,
        )
        analysis_resp.raise_for_status()
        data = analysis_resp.json()["data"]
        import logging
        logging.getLogger(__name__).warning(f"[VirusTotal] analysis status: {data['attributes']['status']}")
        if data["attributes"]["status"] == "completed":
            stats = data["attributes"]["stats"]
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            total = sum(stats.values())
            detected = malicious + suspicious

            if malicious >= 5:
                status = "dangerous"
            elif malicious > 0 or suspicious > 0:
                status = "suspicious"
            else:
                status = "clean"

            return {
                "status": status,
                "engines_total": total,
                "engines_detected": detected,
                "scan_id": analysis_id,
                "details": stats,
            }

    raise TimeoutError("VirusTotal не відповів вчасно")


# ── Views ─────────────────────────────────────────────────────────────────────

import threading
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Build, VirusScanResult, UserScanPurchase


class AdminScanBuildView(APIView):
    """
    POST /api/admin/builds/{build_id}/scan/
    Модератор запускає антивірусну перевірку збірки.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, build_id):
        from .views import is_staff
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)

        build = get_object_or_404(Build, pk=build_id)

        if not build.archive_url and not build.source_file:
            return Response({"error": "Файл збірки не знайдено"}, status=400)

        scan_result, created = VirusScanResult.objects.get_or_create(
            build=build,
            defaults={"scanned_by": request.user, "status": "clean"},
        )
        if not created:
            scan_result.scanned_by = request.user
            scan_result.save(update_fields=["scanned_by"])

        def _run_scan():
            import tempfile, os, requests as req
            try:
                if build.source_file and build.source_file.name:
                    try:
                        file_path = build.source_file.path
                        result = scan_file_virustotal(file_path)
                    except Exception:
                        if build.archive_url:
                            r = req.get(build.archive_url, timeout=60)
                            with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                                tmp.write(r.content)
                                tmp_path = tmp.name
                            try:
                                result = scan_file_virustotal(tmp_path)
                            finally:
                                os.unlink(tmp_path)
                        else:
                            raise
                elif build.archive_url:
                    r = req.get(build.archive_url, timeout=60)
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                        tmp.write(r.content)
                        tmp_path = tmp.name
                    try:
                        result = scan_file_virustotal(tmp_path)
                    finally:
                        os.unlink(tmp_path)
                else:
                    return

                from django.utils import timezone
                VirusScanResult.objects.filter(build=build).update(
                    status=result["status"],
                    engines_total=result["engines_total"],
                    engines_detected=result["engines_detected"],
                    scan_id=result["scan_id"],
                    details=result["details"],
                    scanned_at=timezone.now(),
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"[VirusTotal] Помилка: {e}")
                VirusScanResult.objects.filter(build=build).update(
                    status="error",
                )

        threading.Thread(target=_run_scan, daemon=True).start()
        return Response({"ok": True, "message": "Сканування запущено у фоні"}, status=202)


class AdminScanStatusView(APIView):
    """
    GET /api/admin/builds/{build_id}/scan/
    Отримати поточний результат сканування.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, build_id):
        from .views import is_staff
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)

        build = get_object_or_404(Build, pk=build_id)
        try:
            scan = build.virus_scan
            return Response({
                "status": scan.status,
                "engines_total": scan.engines_total,
                "engines_detected": scan.engines_detected,
                "scanned_at": scan.scanned_at,
                "scanned_by": scan.scanned_by.username if scan.scanned_by else None,
            })
        except VirusScanResult.DoesNotExist:
            return Response({"status": None})


class UserScanResultView(APIView):
    """
    GET /api/builds/{build_id}/scan-result/
    Юзер переглядає результат сканування (якщо є доступ).
    POST — купівля доступу або використання безкоштовної перевірки.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, build_id):
        build = get_object_or_404(Build, pk=build_id)
        profile = request.user.profile

        has_purchased = UserScanPurchase.objects.filter(user=request.user, build=build).exists()
        is_pro = profile.plan == "pro"

        if not has_purchased and not is_pro:
            return Response({"error": "no_access"}, status=403)

        try:
            scan = build.virus_scan
            return Response({
                "status": scan.status,
                "engines_total": scan.engines_total,
                "engines_detected": scan.engines_detected,
                "scanned_at": scan.scanned_at,
            })
        except VirusScanResult.DoesNotExist:
            return Response({"status": None, "message": "Сканування ще не проводилось"})

    def post(self, request, build_id):
        build = get_object_or_404(Build, pk=build_id)
        profile = request.user.profile

        already = UserScanPurchase.objects.filter(user=request.user, build=build).exists()
        if already:
            return Response({"ok": True, "used_credits": False})

        if profile.av_checks_left > 0:
            profile.av_checks_left -= 1
            profile.save(update_fields=["av_checks_left"])
            UserScanPurchase.objects.create(user=request.user, build=build)
            return Response({"ok": True, "used_credits": True, "checks_left": profile.av_checks_left})

        return Response({"error": "no_credits", "message": "Придбайте доступ або поповніть баланс перевірок"}, status=402)


class WorkshopScanView(APIView):
    """
    POST /api/workshop/scan/
    Сканування ZIP з майстерні перед завантаженням.
    Приймає файл, сканує і повертає результат.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import tempfile, os
        profile = request.user.profile

        if profile.av_checks_left <= 0 and profile.plan != "pro":
            return Response({"error": "no_credits"}, status=402)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"error": "Файл не надано"}, status=400)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            for chunk in file_obj.chunks():
                tmp.write(chunk)
            tmp_path = tmp.name

        try:
            result = scan_file_virustotal(tmp_path)
            if profile.av_checks_left > 0:
                profile.av_checks_left -= 1
                profile.save(update_fields=["av_checks_left"])
            return Response(result)
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        finally:
            os.unlink(tmp_path)