def generate_html_email(user_full_name, unit_name, leave_date, verify_url, approvers):
    """
    Generate a detailed HTML email for the approval process with approvers' status.

    :param user_full_name: Full name of the user making the request
    :param unit_name: Name of the unit
    :param leave_date: Date of leave in "DD/MM/YYYY" format
    :param verify_url: URL for approval
    :param approvers: List of approvers with their names and statuses
    :return: Rendered HTML email string
    """
    # Parse leave_date into day, month, and year
    day, month, year = leave_date.split("/")

    # Build the approvers' status table
    approvers_status_html = "".join(
        f"""
        <tr>
          <td>{index + 1}</td>
          <td>{approver['name']}</td>
          <td>{approver['status']}</td>
        </tr>
        """
        for index, approver in enumerate(approvers)
    )

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
          table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }}
          table, th, td {{
            border: 1px solid #ddd;
          }}
          th, td {{
            padding: 8px;
            text-align: left;
          }}
          th {{
            background-color: #f2f2f2;
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
                  <td class="content-block">
                    <p><strong>Kính gửi:</strong> - Thủ trưởng đơn vị</p>
                    <p><strong>Tên quân nhân:</strong> {user_full_name}</p>
                    <p><strong>Đơn vị:</strong> {unit_name}</p>
                    <hr />
                    <p><strong>Nội dung:</strong></p>
                    <p>
                      Tôi, {user_full_name}, xin phép được trình bày đơn xin phép ra ngoài vào ngày {day} tháng {month} năm {year}.
                    </p>
                    <p>
                      Tôi cam kết sẽ hoàn thành nhiệm vụ trước khi xin phép và trở lại đúng thời hạn.
                    </p>
                    <p><strong>Trạng thái phê duyệt:</strong></p>
                    <table>
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Người duyệt</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvers_status_html}
                      </tbody>
                    </table>
                    <p>
                      <a href="{verify_url}" class="button" target="_blank">Phê duyệt yêu cầu</a>
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
        <title>Đặt lại mật khẩu thứ hai</title>
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
                    <h1>ĐẶT LẠI MẬT KHẨU THỨ HAI</h1>
                  </td>
                </tr>
                <tr>
                  <td class="content-block email-body">
                    <p>Kính gửi <strong>{user_full_name}</strong>,</p>
                    <p>
                      Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu thứ hai của bạn. Để tiếp tục, vui lòng nhấp vào nút bên dưới::
                    </p>
                    <a href="{reset_url}" class="button" target="_blank">Đặt lại mật khẩu thứ hai</a>
                    <hr />
                    <p>
                      Nếu bạn không yêu cầu thiết lập lại này, vui lòng bỏ qua email này hoặc liên hệ với quản trị viên để được trợ giúp.
                    </p>
                    <p>
                     Vì lý do bảo mật, liên kết này sẽ hết hạn sau 5 phút.
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


def generate_reset_password_email(user_full_name, reset_url):
    """
    Generate a beautiful HTML email for resetting the password.
    """
    return f"""
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <title>Đặt lại mật khẩu</title>
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
                    <h1>ĐẶT LẠI MẬT KHẨU</h1>
                  </td>
                </tr>
                <tr>
                  <td class="content-block email-body">
                    <p>Kính gửi <strong>{user_full_name}</strong>,</p>
                    <p>
                      Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu của bạn. Vui lòng nhấp vào nút bên dưới để tiếp tục:
                    </p>
                    <a href="{reset_url}" class="button" target="_blank">Đặt lại mật khẩu</a>
                    <hr />
                    <p>
                      Nếu bạn không yêu cầu thiết lập lại này, vui lòng bỏ qua email này hoặc liên hệ với quản trị viên để được hỗ trợ.
                    </p>
                    <p>
                        Vì lý do bảo mật, liên kết này sẽ hết hạn sau 5 phút.
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
