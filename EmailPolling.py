# import imaplib
# import email
# import json
# import re
# import requests
# import logging
# from datetime import datetime
#
# from application import send_email, db
# from application.email import generate_html_email
#
# from apscheduler.schedulers.background import BackgroundScheduler
# from flask import Flask
# import atexit
#
# from application.models import SponsorCheckIn
#
# # Configure logging
# logging.basicConfig(level=logging.DEBUG)
# logger = logging.getLogger(__name__)
#
#
# app = Flask(__name__)
#
#
# IMAP_SERVER = "imap.gmail.com"
# IMAP_USER = app.config.get("MAIL_USERNAME")
# IMAP_PASSWORD = app.config.get("MAIL_PASSWORD")
#
# def check_email():
#     """
#     Check the inbox for replies to approval emails.
#     """
#     try:
#         # Connect to IMAP server
#         mail = imaplib.IMAP4_SSL(IMAP_SERVER)
#         mail.login(IMAP_USER, IMAP_PASSWORD)
#         mail.select("inbox")
#
#         # Search for unread emails
#         status, messages = mail.search(None, "UNSEEN")
#         if status != "OK":
#             return
#         for num in messages[0].split():
#             status, data = mail.fetch(num, "(RFC822)")
#             if status != "OK":
#                 print("Failed to fetch email.")
#                 continue
#
#             # Parse the email content
#             msg = email.message_from_bytes(data[0][1])
#             subject = msg["subject"]
#             sender = msg["from"]
#
#             print(f"Processing email from {sender} with subject: {subject}")
#
#             # Match the subject for approval replies
#             match = re.match(r"\[Approve: (\d+)-([a-zA-Z0-9\-]+)-(\d+)\]", subject)
#             if match:
#                 user_id, token, acceptor_level = match.groups()
#                 print(f"Processing approval for user_id {user_id}, token {token}, acceptor level {acceptor_level}")
#                 process_approval(user_id, token, acceptor_level)
#
#
#         # Close the mailbox and logout
#         mail.close()
#         mail.logout()
#
#     except Exception as e:
#         print(f"Error checking email: {e}")
#
# def process_approval(user_id, token, acceptor_level):
#     # Check internet connection
#     try:
#         requests.get("http://www.google.com", timeout=5)
#     except requests.ConnectionError:
#         return render_template(
#             "error.html",
#             error_message="Không thể kết nối Internet. Vui lòng kiểm tra kết nối mạng của bạn và thử lại.",
#         )
#     try:
#         # Retrieve the check-in record
#         print(f"User ID: {user_id}, Token: {token}, Acceptor Level: {acceptor_level}")
#         check_in_record = SponsorCheckIn.query.filter_by(
#             user_id=user_id, token=token
#         ).first()
#
#         if not check_in_record:
#             return render_template(
#                 "approval_status.html",
#                 status="error",
#                 message="Không tìm thấy yêu cầu phê duyệt này hoặc liên kết không hợp lệ.",
#             )
#
#         # Load the acceptors JSON field
#         acceptors = json.loads(check_in_record.acceptors or "[]")
#         if acceptor_level > len(acceptors):
#             return render_template(
#                 "approval_status.html",
#                 status="error",
#                 message="Cấp phê duyệt không hợp lệ.",
#             )
#
#         # Get the current approver details
#         current_acceptor = acceptors[acceptor_level - 1]
#         current_status = current_acceptor.get("status", "Chờ duyệt")
#
#         # Check if already approved
#         if current_status == "accepted":
#             return render_template(
#                 "approval_status.html",
#                 status="info",
#                 message=f"Yêu cầu ra ngoài của {check_in_record.full_name} đã được phê duyệt bởi cấp {acceptor_level} trước đó.",
#             )
#
#         # Update the current approver's status
#         current_acceptor["status"] = "accepted"
#         acceptors[acceptor_level - 1] = current_acceptor
#
#         # Determine if this is the last approver
#         if acceptor_level == len(acceptors):
#             # All approvers have approved; update the global status
#             check_in_record.status = "accepted"
#             check_in_record.accepted_datetime = datetime.utcnow()
#             check_in_record.acceptors = json.dumps(acceptors)
#             db.session.commit()
#             return render_template(
#                 "approval_status.html",
#                 status="success",
#                 message=f"Yêu cầu ra ngoài của {check_in_record.full_name} đã được phê duyệt bởi tất cả cấp duyệt!",
#             )
#
#         # Prepare for the next approver
#         next_acceptor_level = acceptor_level + 1
#         next_acceptor = acceptors[next_acceptor_level - 1]
#
#         next_approver_email = next_acceptor.get(
#             f"acceptor-level-{next_acceptor_level}-manager_id-manager_email", None
#         )
#         next_acceptor["status"] = "created"
#         acceptors[next_acceptor_level - 1] = next_acceptor
#         approval_url = f"{app.config.get('WEB_HOST_URL')}/approve/{user_id}/check-out/{token}/{next_acceptor_level}"
#         subject = f"Approval Request for Check-in: {check_in_record.full_name}"
#         approvers_list = [
#             {
#                 "email": acceptor.get(
#                     f"acceptor-level-{index + 1}-manager_id-manager_email"
#                 ),
#                 "name": acceptor.get(
#                     f"acceptor-level-{index + 1}-manager_id-manager_full_name", "N/A"
#                 ),
#                 "status": STATUS_TRANSLATIONS.get(
#                     acceptor.get("status", "Chờ duyệt"), "Chờ duyệt"
#                 ),
#             }
#             for index, acceptor in enumerate(acceptors)
#         ]
#         body_html = generate_html_email(
#             check_in_record.full_name,
#             check_in_record.military_unit_name or "N/A",
#             datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S"),
#             approval_url,
#             approvers_list,
#             user_id,
#             token,
#             next_acceptor_level,
#             current_user_email=current_user.email
#         )
#         # generate_html_email(user_full_name, unit_name, leave_date, verify_url, approvers, user_id, token, next_acceptor_level):
#
#         send_email(subject, next_approver_email, body_html)
#
#         # Save updated acceptors to the database
#         check_in_record.acceptors = json.dumps(acceptors)
#         db.session.commit()
#
#         return render_template(
#             "approval_status.html",
#             status="success",
#             message=f"Yêu cầu ra ngoài của {check_in_record.full_name} đã được phê duyệt! Đã gửi yêu cầu tiếp theo cho cấp {next_acceptor_level}.",
#         )
#
#     except Exception as e:
#         return render_template(
#             "approval_status.html", status="error", message=f"Có lỗi xảy ra: {str(e)}"
#         )
#
# def check_email_job():
#     check_email()
#
# # Initialize the scheduler
# scheduler = BackgroundScheduler()
# scheduler.add_job(func=check_email_job, trigger="interval", seconds=60)  # Run every 60 seconds
# scheduler.start()
#
# # Shut down the scheduler when exiting the app
# atexit.register(lambda: scheduler.shutdown())
#
# if __name__ == "__main__":
#     app.run()
# ================= //// ===================
import imaplib
import email
import json
import os
import re
import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask
import atexit

from application import app, send_email, db
from application.email import generate_html_email
from application.models import SponsorCheckIn

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Email configuration
IMAP_SERVER = "imap.gmail.com"
IMAP_USER = app.config.get("MAIL_USERNAME")
IMAP_PASSWORD = app.config.get("MAIL_PASSWORD")
SYSTEM_EMAIL = app.config.get("MAIL_DEFAULT_SENDER")

if not IMAP_USER or not IMAP_PASSWORD or not SYSTEM_EMAIL:
    logger.error("Missing email configuration in environment.")
    raise ValueError("MAIL_USERNAME, MAIL_PASSWORD, or MAIL_DEFAULT_SENDER is not set.")


def process_approval(user_id, token, acceptor_level):
    """
    Process the approval for a specific check-in record.
    """
    try:
        logger.info(
            f"Fetching check-in record for user_id={user_id}, token={token}, acceptor_level={acceptor_level}"
        )

        # Ensure database operations run within the app context
        with app.app_context():
            check_in_record = SponsorCheckIn.query.filter_by(
                user_id=user_id, token=token
            ).first()

            if not check_in_record:
                logger.error(
                    f"Check-in record not found for user_id={user_id}, token={token}"
                )
                return

            acceptors = json.loads(check_in_record.acceptors or "[]")
            acceptor_level = int(acceptor_level)

            if acceptor_level > len(acceptors):
                logger.error(
                    f"Invalid approver level {acceptor_level} for check-in record {check_in_record.id}"
                )
                return

            current_acceptor = acceptors[acceptor_level - 1]
            current_status = current_acceptor.get("status", "Chờ duyệt")

            if current_status == "accepted":
                logger.info(
                    f"Approval already processed for acceptor level {acceptor_level}."
                )
                return

            current_acceptor["status"] = "accepted"
            acceptors[acceptor_level - 1] = current_acceptor

            if acceptor_level == len(acceptors):
                check_in_record.status = "accepted"
                check_in_record.accepted_datetime = datetime.utcnow()
                check_in_record.acceptors = json.dumps(acceptors)
                db.session.commit()
                logger.info(f"Check-in request {check_in_record.id} fully approved.")
                return

            next_acceptor_level = acceptor_level + 1
            next_acceptor = acceptors[next_acceptor_level - 1]
            next_approver_email = next_acceptor.get(
                f"acceptor-level-{next_acceptor_level}-manager_id-manager_email", None
            )
            next_acceptor["status"] = "created"
            acceptors[next_acceptor_level - 1] = next_acceptor

            approval_url = f"approve/{user_id}/check-out/{token}/{next_acceptor_level}"
            subject = f"Approval Request for Check-in: {check_in_record.full_name}"
            approvers_list = [
                {
                    "name": acceptor.get(
                        f"acceptor-level-{index + 1}-manager_id-manager_full_name",
                        "N/A",
                    ),
                    "status": acceptor.get("status", "Chờ duyệt"),
                }
                for index, acceptor in enumerate(acceptors)
            ]
            body_html = generate_html_email(
                check_in_record.full_name,
                check_in_record.military_unit_name or "N/A",
                datetime.utcnow().strftime("%d/%m/%Y %H:%M:%S"),
                approval_url,
                approvers_list,
                MAIL_DEFAULT_SENDER=SYSTEM_EMAIL,
            )
            send_email(subject, next_approver_email, body_html)

            check_in_record.acceptors = json.dumps(acceptors)
            db.session.commit()
            logger.info(
                f"Approval request forwarded to next acceptor at level {next_acceptor_level}."
            )

    except Exception as e:
        logger.error(f"Error processing approval: {e}")


def check_email():
    """
    Check the inbox for replies to approval emails and process approvals.
    """
    try:
        logger.info("Connecting to IMAP server...")
        logger.info("\n\n================= Start processing =================")

        # Connect to the IMAP server
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(IMAP_USER, IMAP_PASSWORD)
        mail.select("inbox")

        # Search for unread (UNSEEN) emails
        status, messages = mail.search(None, "UNSEEN")
        if status != "OK":
            logger.warning("Failed to fetch emails.")
            return

        message_numbers = messages[0].split()
        if not message_numbers:
            logger.info("No new (UNSEEN) emails found.")
            return

        logger.info(f"Found {len(message_numbers)} UNSEEN email(s).")

        # Process each email
        for num in message_numbers:
            logger.debug(f"Fetching email with ID {num.decode()}")
            status, data = mail.fetch(num, "(RFC822)")
            if status != "OK":
                logger.warning(
                    f"Failed to fetch email content for email ID {num.decode()}."
                )
                continue

            # Parse the email content
            msg = email.message_from_bytes(data[0][1])
            subject = msg["subject"]
            logger.info(f"Processing email {num.decode()} with subject: {subject}")

            # Clean and parse the subject
            subject_cleaned = subject.lower().strip().replace("approve ", "").strip()
            try:
                parts = subject_cleaned.split("/")
                logger.debug(f"Parsed subject parts: {parts}")

                if len(parts) == 5 and parts[0] == "approve":
                    _, user_id, _, token, acceptor_level = parts
                    logger.info(
                        f"Extracted parameters: user_id={user_id}, token={token}, acceptor_level={acceptor_level}"
                    )
                    process_approval(user_id, token, acceptor_level)
                else:
                    logger.warning(
                        f"Email subject does not match approval pattern: {subject_cleaned}"
                    )
            except Exception as e:
                logger.error(f"Error parsing subject '{subject}': {e}")

        # Close the mailbox and logout
        mail.close()
        mail.logout()
        logger.info("Finished processing emails and logged out.")
        logger.info("================= Finished processing =================\n\n")

    except Exception as e:
        logger.error(f"Error checking email: {e}")


def check_email_job():
    """
    Periodic job to check for email replies.
    """
    logger.info("Starting email check job...")
    check_email()


# Initialize the scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(
    func=check_email_job, trigger="interval", seconds=30
)  # Run every 30 seconds
scheduler.start()

atexit.register(lambda: scheduler.shutdown())

if __name__ == "__main__":
    app.run(debug=False, port=5000)
