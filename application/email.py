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


def generate_reset_second_password_email(user_full_name, reset_url):
    """
    Generate a beautiful HTML email for resetting the second password.
    :param user_full_name: Full name of the user
    :param reset_url: Reset URL for the second password
    :return: Rendered HTML email string
    """
    return f"""
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <title>Reset Second Password</title>
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
                    <h1>RESET SECOND PASSWORD</h1>
                  </td>
                </tr>
                <tr>
                  <td class="content-block email-body">
                    <p>Dear <strong>{user_full_name}</strong>,</p>
                    <p>
                      We received a request to reset your second password. To proceed, please click the button below:
                    </p>
                    <a href="{reset_url}" class="button" target="_blank">Reset Second Password</a>
                    <hr />
                    <p>
                      If you did not request this reset, please ignore this email or contact your administrator for assistance.
                    </p>
                    <p>
                      For security reasons, this link will expire in 1 hour.
                    </p>
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
