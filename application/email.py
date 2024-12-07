# def generate_html_email(full_name, approve_url):
#     """
#     Generates the HTML content for the email.
#     """
#     return f"""
#     <!DOCTYPE html>
#     <html lang="en">
#     <head>
#         <meta charset="UTF-8">
#         <meta name="viewport" content="width=device-width, initial-scale=1.0">
#         <title>Approval Email</title>
#         <style>
#             body {{
#                 font-family: Arial, sans-serif;
#                 background-color: #f4f4f9;
#                 margin: 0;
#                 padding: 0;
#                 line-height: 1.6;
#                 color: #333;
#             }}
#             .email-container {{
#                 max-width: 600px;
#                 margin: auto;
#                 background-color: #ffffff;
#                 border-radius: 8px;
#                 box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
#                 overflow: hidden;
#             }}
#             .email-header {{
#                 background-color: #1e3a8a;
#                 color: #ffffff;
#                 padding: 20px;
#                 text-align: center;
#                 font-size: 24px;
#                 font-weight: bold;
#             }}
#             .email-body {{
#                 padding: 20px;
#                 text-align: center;
#             }}
#             .email-body p {{
#                 font-size: 16px;
#                 margin-bottom: 20px;
#             }}
#             .approve-button {{
#                 display: inline-block;
#                 background-color: #28a745;
#                 color: #ffffff;
#                 text-decoration: none;
#                 padding: 12px 20px;
#                 border-radius: 5px;
#                 font-size: 16px;
#                 font-weight: bold;
#                 box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
#             }}
#             .approve-button:hover {{
#                 background-color: #218838;
#             }}
#             .email-footer {{
#                 background-color: #f1f1f1;
#                 padding: 10px;
#                 text-align: center;
#                 font-size: 14px;
#                 color: #666;
#             }}
#         </style>
#     </head>
#     <body>
#         <div class="email-container">
#             <div class="email-header">
#                 Approval Required
#             </div>
#             <div class="email-body">
#                 <p>Dear {full_name},</p>
#                 <p>Your information has been submitted for approval. Please click the button below to approve:</p>
#                 <a href="{approve_url}" class="approve-button">Approve Now</a>
#             </div>
#             <div class="email-footer">
#                 <p>&copy; 2024 Your Company. All rights reserved.</p>
#             </div>
#         </div>
#     </body>
#     </html>
#     """


# def generate_html_email(full_name, approve_url):
#     """
#     Generates the HTML content for the email with a professional design and Vietnamese translation.
#     """
#     return f"""
#     <!DOCTYPE html>
#     <html lang="vi">
#     <head>
#         <meta charset="UTF-8">
#         <meta name="viewport" content="width=device-width, initial-scale=1.0">
#         <title>Xác nhận phê duyệt</title>
#         <style>
#             body {{
#                 font-family: 'Arial', sans-serif;
#                 background-color: #f4f4f9;
#                 margin: 0;
#                 padding: 0;
#                 line-height: 1.6;
#                 color: #333;
#             }}
#             .email-container {{
#                 max-width: 600px;
#                 margin: 20px auto;
#                 background-color: #ffffff;
#                 border-radius: 8px;
#                 box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
#                 overflow: hidden;
#                 border: 1px solid #ddd;
#             }}
#             .email-header {{
#                 background-color: #0d6efd;
#                 color: #ffffff;
#                 padding: 20px;
#                 text-align: center;
#                 font-size: 24px;
#                 font-weight: bold;
#                 text-transform: uppercase;
#             }}
#             .email-body {{
#                 padding: 20px;
#                 text-align: left;
#             }}
#             .email-body p {{
#                 font-size: 16px;
#                 margin-bottom: 15px;
#             }}
#             .approve-button {{
#                 display: inline-block;
#                 background-color: #198754;
#                 color: #ffffff;
#                 text-decoration: none;
#                 padding: 12px 20px;
#                 border-radius: 5px;
#                 font-size: 16px;
#                 font-weight: bold;
#                 text-align: center;
#                 box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
#                 margin: 20px auto;
#                 display: block;
#                 width: 200px;
#             }}
#             .approve-button:hover {{
#                 background-color: #157347;
#             }}
#             .email-footer {{
#                 background-color: #f1f1f1;
#                 padding: 10px;
#                 text-align: center;
#                 font-size: 14px;
#                 color: #666;
#                 border-top: 1px solid #ddd;
#             }}
#         </style>
#     </head>
#     <body>
#         <div class="email-container">
#             <!-- Header -->
#             <div class="email-header">
#                 Phê Duyệt Thông Tin
#             </div>
#             <!-- Body -->
#             <div class="email-body">
#                 <p>Kính gửi {full_name},</p>
#                 <p>Thông tin của bạn đã được gửi để phê duyệt. Vui lòng nhấn vào nút bên dưới để xác nhận:</p>
#                 <a href="{approve_url}" class="approve-button">Phê Duyệt Ngay</a>
#                 <p>Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email này.</p>
#             </div>
#             <!-- Footer -->
#             <div class="email-footer">
#                 <p>&copy; 2024 Đơn Vị Quân Đội. Mọi quyền được bảo lưu.</p>
#                 <p>Email này được gửi tự động, vui lòng không trả lời.</p>
#             </div>
#         </div>
#     </body>
#     </html>
#     """


def generate_html_email(user_full_name, unit_name, leave_date, verify_url):
    """
    Generate a beautiful HTML email for "Đơn xin phép ra ngoài" in Vietnamese.
    :param user_full_name: Full name of the user
    :param unit_name: Name of the unit
    :param leave_date: Date of leave in "DD/MM/YYYY" format
    :param verify_url: Verification URL for approval
    :return: Rendered HTML email string
    """
    # Parse leave_date into day, month, and year
    day, month, year = leave_date.split("/")

    return f"""
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <title>Đơn xin phép ra ngoài</title>
        <meta charset="UTF-8" />
        <style>
          body {{
            background-color: #f6f6f6;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            color: #333;
          }}
          .email-container {{
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }}
          .email-body {{
            padding: 20px;
          }}
          .header,
          .footer {{
            text-align: center;
            background-color: #007bff;
            color: #ffffff;
            padding: 10px;
            border-radius: 8px 8px 0 0;
          }}
          .footer {{
            border-radius: 0 0 8px 8px;
            background-color: #343a40;
          }}
          .button {{
            display: inline-block;
            padding: 10px 20px;
            margin: 20px 0;
            background-color: #28a745;
            color: #ffffff;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }}
          .button:hover {{
            background-color: #218838;
          }}
        </style>
      </head>
      <body>
        <table class="email-container" align="center" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <h1>ĐƠN XIN PHÉP RA NGOÀI</h1>
                  </td>
                </tr>
                <tr>
                  <td class="content-block email-body">
                    <p><strong>Kính gửi:</strong> - Thủ trưởng đơn vị</p>
                    <p><strong>Tên quân nhân:</strong> {user_full_name}</p>
                    <p><strong>Đơn vị:</strong> {unit_name}</p>
                    <hr />
                    <p><strong>Nội dung:</strong></p>
                    <p>
                      Kính thưa Thủ trưởng,
                      <br />
                      Tôi, {user_full_name}, xin phép được trình bày đơn xin phép ra ngoài vào ngày {day} tháng {month} năm {year}.
                    </p>
                    <p>
                      Tôi xin cam kết sẽ hoàn thành mọi nhiệm vụ được giao trước khi xin phép và sẽ trở lại đơn vị đúng thời hạn.
                      Tôi cũng sẽ tuân thủ mọi quy định của đơn vị trong thời gian ra ngoài.
                    </p>
                    <p>Rất mong Thủ trưởng xem xét và chấp thuận đơn xin phép của tôi.</p>
                    <p>Xin trân trọng cảm ơn!</p>
                    <a href="{verify_url}" class="button" target="_blank">Xác nhận Đơn Xin Phép</a>
                   
                  </td>
                </tr>
                <tr>
                  <td align="center" class="footer">
                    <p>© 2024 Quản lý quân nhân. Bảo lưu mọi quyền.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """
