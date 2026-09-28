const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Database Structure
const initialData = {
  users: [],
  villages: [],
  schools: [],
  scamTypes: [],
  handbookArticles: [],
  alerts: [],
  reports: [],
  reportLogs: [],
  settings: {
    communeName: "CÔNG AN XÃ TRÀ LIÊN",
    appTitle: "Báo cáo lừa đảo & Cẩm nang phòng chống lừa đảo",
    hotline: "0235.3855.113 - 0988.113.113",
    email: "conganxatralien@quangnam.gov.vn",
    address: "Trung tâm hành chính xã Trà Liên, huyện Trà Bồng, tỉnh Quảng Ngãi",
    bannerTitle: "BẢO VỆ BẠN VÀ GIA ĐÌNH TRƯỚC LỪA ĐẢO TRỰC TUYẾN",
    bannerSubtitle: "Phát hiện sớm – Báo cáo nhanh – Chủ động phòng tránh",
    workingHours: "Trực ban tiếp nhận thông tin 24/7 - Kể cả ngày lễ, Thứ 7, Chủ nhật",
    logoUrl: "/images/police-badge.png",
    privacyNotice: "Thông tin của người báo cáo được Công an xã Trà Liên bảo mật tuyệt đối theo quy định của pháp luật. Nghiêm cấm các hành vi lợi dụng cung cấp thông tin sai sự thật.",
    updatedAt: new Date().toISOString()
  }
};

class Database {
  constructor() {
    this.load();
    this.seedDefaultsIfEmpty();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all collections exist
        for (const key of Object.keys(initialData)) {
          if (!this.data[key]) {
            this.data[key] = Array.isArray(initialData[key]) ? [] : { ...initialData[key] };
          }
        }
      } else {
        this.data = JSON.parse(JSON.stringify(initialData));
        this.save();
      }
    } catch (err) {
      console.error("Database load error, initializing fresh store:", err);
      this.data = JSON.parse(JSON.stringify(initialData));
      this.save();
    }
  }

  save() {
    try {
      const tempFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DATA_FILE);
    } catch (err) {
      console.error("Database save error:", err);
    }
  }

  seedDefaultsIfEmpty() {
    let modified = false;

    // 1. Seed Users (Admin & Officer)
    if (!this.data.users || this.data.users.length === 0) {
      const adminSalt = bcrypt.genSaltSync(10);
      const officerSalt = bcrypt.genSaltSync(10);
      this.data.users = [
        {
          id: "u-admin",
          username: "admin",
          passwordHash: bcrypt.hashSync("congantralien@2026", adminSalt),
          fullName: "Đại úy Nguyễn Văn Hùng - Trưởng Công an xã",
          role: "ADMIN",
          phone: "0988.113.113",
          badgeNumber: "TL-001",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "u-officer1",
          username: "canbo1",
          passwordHash: bcrypt.hashSync("canbo123@", officerSalt),
          fullName: "Thượng úy Trần Minh Trí - Cán bộ điều tra",
          role: "OFFICER",
          phone: "0912.345.678",
          badgeNumber: "TL-008",
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: "u-officer2",
          username: "canbo2",
          passwordHash: bcrypt.hashSync("canbo123@", officerSalt),
          fullName: "Trung úy Lê Thị Cẩm - Cán bộ CSKV & Tuyên truyền",
          role: "OFFICER",
          phone: "0905.789.123",
          badgeNumber: "TL-012",
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      modified = true;
    }

    // 2. Seed 6 Villages specified by prompt
    if (!this.data.villages || this.data.villages.length === 0) {
      this.data.villages = [
        {
          id: "v-1",
          name: "Thôn Định Yên",
          code: "DY",
          description: "Khu vực trung tâm hành chính xã, dân cư đông đúc, có tuyến đường liên xã đi qua. Thường xuyên diễn ra các giao dịch buôn bán nông sản và dịch vụ thương mại.",
          population: 1850,
          households: 420,
          headOfficer: "Đồng chí Đại úy Nguyễn Văn Hùng (Phụ trách chung)",
          contactPhone: "0235.3855.113",
          imageUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&auto=format&fit=crop&q=80",
          propagandaContent: "Bà con Thôn Định Yên cảnh giác cao độ với thủ đoạn giả danh nhân viên ngân hàng gọi điện yêu cầu nâng cấp sim 4G, kích hoạt mã VNeID mức 2 hoặc nộp phạt nguội qua điện thoại.",
          isActive: true,
          order: 1
        },
        {
          id: "v-2",
          name: "Thôn Phương Đông",
          code: "PD",
          description: "Địa bàn tiếp giáp xã bạn, có nhiều hộ gia đình có con em đi làm ăn xa tại các khu công nghiệp phía Nam và nước ngoài. Tiềm ẩn nguy cơ lừa đảo mượn tiền qua mạng xã hội.",
          population: 1420,
          households: 310,
          headOfficer: "Đồng chí Thượng úy Trần Minh Trí",
          contactPhone: "0912.345.678",
          imageUrl: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80",
          propagandaContent: "Cảnh giác với các tin nhắn Messenger, Zalo mượn tiền từ tài khoản của người thân ở xa. Hãy gọi điện thoại thoại thông thường hoặc gọi video để xác minh danh tính trước khi chuyển tiền.",
          isActive: true,
          order: 2
        },
        {
          id: "v-3",
          name: "Thôn Thanh Trước",
          code: "TT",
          description: "Vùng đồi gò ven suối, kinh tế chủ yếu là trồng quế, keo và chăn nuôi. Đa số người lớn tuổi ở nhà trông coi con cháu, dễ trở thành mục tiêu của các đối tượng bán thuốc gia truyền rởm, trúng thưởng giả.",
          population: 1100,
          households: 250,
          headOfficer: "Đồng chí Trung úy Lê Thị Cẩm",
          contactPhone: "0905.789.123",
          imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80",
          propagandaContent: "Tuyệt đối không mua các loại thực phẩm chức năng, thuốc nam quảng cáo trên mạng không rõ nguồn gốc. Không nộp tiền phí nhận quà trúng thưởng xe máy, tivi qua bưu điện.",
          isActive: true,
          order: 3
        },
        {
          id: "v-4",
          name: "Thôn 1 Trà Nú",
          code: "TN1",
          description: "Khu vực đồng bào dân tộc thiểu số Kor sinh sống tập trung. Tình làng nghĩa xóm bền chặt, bà con chất phác, thật thà nên dễ bị các đối tượng dụ dỗ làm nhiệm vụ nhận tiền trên điện thoại.",
          population: 980,
          households: 215,
          headOfficer: "Đồng chí Thượng úy Trần Minh Trí",
          contactPhone: "0912.345.678",
          imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
          propagandaContent: "Không có chuyện việc nhẹ lương cao bấm like video, tải app làm nhiệm vụ mà kiếm được hàng triệu đồng mỗi ngày. Đây 100% là bẫy lừa đảo nạp tiền rồi khóa tài khoản.",
          isActive: true,
          order: 4
        },
        {
          id: "v-5",
          name: "Thôn 2 Trà Nú",
          code: "TN2",
          description: "Địa hình vùng cao, có nhiều lán trại sản xuất nông lâm nghiệp. Thanh niên trong thôn tiếp cận mạng xã hội TikTok, Facebook nhiều nhưng kỹ năng an ninh mạng còn hạn chế.",
          population: 890,
          households: 195,
          headOfficer: "Đồng chí Trung úy Lê Thị Cẩm",
          contactPhone: "0905.789.123",
          imageUrl: "https://images.unsplash.com/photo-1511497584788-87676104235f?w=800&auto=format&fit=crop&q=80",
          propagandaContent: "Cảnh báo thanh thiếu niên tuyệt đối không tham gia các đường link cờ bạc tài xỉu online, các nhóm Telegram kéo vốn sinh lời gấp 10 lần. Tránh bị thao túng tâm lý.",
          isActive: true,
          order: 5
        },
        {
          id: "v-6",
          name: "Thôn 1 Trà Kót",
          code: "TK1",
          description: "Thôn cửa ngõ phía Tây của xã, địa bàn rộng, nhiều đường mòn giao thông nông thôn. Tình hình an ninh trật tự được giữ vững thông qua các mô hình Zalo an ninh thôn xóm.",
          population: 1250,
          households: 280,
          headOfficer: "Đồng chí Đại úy Nguyễn Văn Hùng",
          contactPhone: "0235.3855.113",
          imageUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80",
          propagandaContent: "Mỗi người dân Thôn 1 Trà Kót là một pháo đài phòng chống tội phạm công nghệ cao. Khi nhận cuộc gọi đe dọa từ 'Cơ quan điều tra, Tòa án', lập tức báo cho Công an xã Trà Liên.",
          isActive: true,
          order: 6
        }
      ];
      modified = true;
    }

    // 3. Seed 3 Schools specified by prompt
    if (!this.data.schools || this.data.schools.length === 0) {
      this.data.schools = [
        {
          id: "s-1",
          name: "Trường Mẫu giáo Hương Trà, xã Trà Liên",
          code: "MG-HT",
          level: "Mầm non",
          description: "Trường mầm non trung tâm xã với hơn 180 cháu thiếu nhi. Phụ huynh thường xuyên sử dụng mạng xã hội Zalo nhóm lớp để liên lạc với cô giáo.",
          contactInfo: "Cô Hiệu trưởng: 0914.123.456 - Văn phòng trường: 0235.3855.221",
          imageUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&auto=format&fit=crop&q=80",
          studentWarning: "Cảnh giác chiêu trò lừa đảo 'Con đang cấp cứu ở bệnh viện cần chuyển tiền gấp'. Phụ huynh cần bình tĩnh liên hệ ngay với giáo viên chủ nhiệm hoặc Ban giám hiệu nhà trường.",
          parentGuide: "1. Luôn lưu số điện thoại của giáo viên chủ nhiệm trong danh bạ.\n2. Tuyệt đối không chuyển tiền vào tài khoản lạ do người tự xưng là bác sĩ/nhân viên y tế cung cấp.\n3. Hướng dẫn con không nhận quà hoặc đi theo người lạ khi tan trường.",
          isActive: true,
          order: 1
        },
        {
          id: "s-2",
          name: "Trường TH&THCS Phương Đông, xã Trà Liên",
          code: "THCS-PD",
          level: "Tiểu học & THCS",
          description: "Trường liên cấp trọng điểm của xã với 380 học sinh. Lứa tuổi học sinh THCS bắt đầu sử dụng điện thoại thông minh nhiều, chơi game online và có nhu cầu mua sắm ảo.",
          contactInfo: "Thầy Hiệu trưởng: 0973.555.789 - Phòng Đoàn Đội: 0235.3855.334",
          imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
          studentWarning: "Cảnh báo học sinh về cạm bẫy 'Nạp thẻ game trúng acc VIP', 'Mua bán nick Liên Quân, Free Fire giá rẻ', 'Tải app làm khảo sát nhận tiền tiêu vặt'. Nhiều em bị chiếm đoạt tài khoản Facebook hoặc bị tống tiền.",
          parentGuide: "1. Quản lý thời gian và nội dung sử dụng Internet của con em.\n2. Cảnh báo con không được chụp và gửi ảnh/video cá nhân nhạy cảm cho bất kỳ ai trên mạng.\n3. Cài đặt các ứng dụng giám sát an toàn cho trẻ em.",
          isActive: true,
          order: 2
        },
        {
          id: "s-3",
          name: "Trường PTDTBT TH&THCS Trần Phú, xã Trà Liên",
          code: "PTDTBT-TP",
          level: "Phổ thông Dân tộc Bán trú",
          description: "Nuôi dạy hơn 260 em học sinh con em đồng bào miền núi ăn ở nội trú, bán trú. Môi trường sinh hoạt đoàn kết, yêu thương, có các buổi sinh hoạt ngoại khóa pháp luật.",
          contactInfo: "Thầy Phó Hiệu trưởng phụ trách: 0982.777.999 - Tổng phụ trách Đội: 0905.113.888",
          imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80",
          studentWarning: "Học sinh bán trú không chia sẻ thông tin tài khoản, mật khẩu mạng xã hội cho bạn bè. Không tham gia các nhóm kín lôi kéo bỏ học đi làm 'việc nhẹ lương cao' tại các thành phố lớn.",
          parentGuide: "1. Thường xuyên tâm sự, nắm bắt tâm tư tình cảm của con em khi về thăm nhà cuối tuần.\n2. Khi phát hiện con có biểu hiện lạ, nhận được tiền hoặc đồ vật đắt tiền không rõ nguồn gốc, cần trao đổi ngay với nhà trường và Công an xã.",
          isActive: true,
          order: 3
        }
      ];
      modified = true;
    }

    // 4. Seed Scam Types
    if (!this.data.scamTypes || this.data.scamTypes.length === 0) {
      this.data.scamTypes = [
        { id: "st-1", name: "Việc nhẹ - lương cao, làm nhiệm vụ online", icon: "briefcase", isActive: true },
        { id: "st-2", name: "Giả danh Công an, Viện kiểm sát, Tòa án", icon: "shield-alert", isActive: true },
        { id: "st-3", name: "Giả mạo Ngân hàng, mã OTP, app thuế VNeID giả", icon: "landmark", isActive: true },
        { id: "st-4", name: "Hack nick Zalo/Facebook mượn tiền", icon: "message-circle", isActive: true },
        { id: "st-5", name: "Thông báo trúng thưởng, tặng quà tri ân", icon: "gift", isActive: true },
        { id: "st-6", name: "Lừa đảo tuyển dụng, xuất khẩu lao động", icon: "user-check", isActive: true },
        { id: "st-7", name: "Đầu tư sàn ảo, tiền mã hóa, chứng khoán quốc tế", icon: "trending-up", isActive: true },
        { id: "st-8", name: "Mua bán hàng online bẫy cọc, shipper giả", icon: "shopping-bag", isActive: true },
        { id: "st-9", name: "Vay tiền online app đen, giải ngân ảo", icon: "credit-card", isActive: true },
        { id: "st-10", name: "Giả danh người thân ở nước ngoài nhờ nhận tiền", icon: "users", isActive: true },
        { id: "st-11", name: "Quét mã QR độc hại, dán đè mã QR thanh toán", icon: "qr-code", isActive: true },
        { id: "st-12", name: "Deepfake video call AI mạo danh khuôn mặt, giọng nói", icon: "video", isActive: true },
        { id: "st-13", name: "Lừa đảo nhắm vào người cao tuổi (bán thuốc giả, bảo hiểm)", icon: "heart", isActive: true },
        { id: "st-14", name: "Lừa đảo học sinh (nạp game giả, mua acc, bẫy việc làm)", icon: "graduation-cap", isActive: true },
        { id: "st-15", name: "Thủ đoạn lừa đảo khác", icon: "help-circle", isActive: true }
      ];
      modified = true;
    }

    // 5. Seed 14 Detailed Handbook Articles
    if (!this.data.handbookArticles || this.data.handbookArticles.length === 0) {
      this.data.handbookArticles = [
        {
          id: "hb-1",
          title: "Lừa đảo việc nhẹ – lương cao: Bẫy tài chính hiểm độc",
          category: "Việc làm & Tuyển dụng",
          scamTypeId: "st-1",
          imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80",
          summary: "Chiêu trò tuyển cộng tác viên xử lý đơn hàng Shopee, TikTok, xem video nhận tiền nhưng thực chất là bẫy nạp tiền rồi chiếm đoạt.",
          signs: [
            "Không yêu cầu bằng cấp, kinh nghiệm, làm việc tại nhà 2-3 giờ/ngày.",
            "Hứa hẹn thu nhập bất thường từ 500.000đ - 3.000.000đ/ngày.",
            "Yêu cầu nạp tiền đối ứng hoặc chuyển khoản đặt cọc trước khi rút hoa hồng.",
            "Yêu cầu tải ứng dụng Telegram hoặc cài file .APK lạ không qua Google Play/App Store."
          ],
          examples: "Chị H. (thôn Định Yên) được mời tham gia nhóm làm nhiệm vụ tăng tương tác YouTube. 2 nhiệm vụ đầu được thưởng 50.000đ và rút về ngân hàng thật. Đến nhiệm vụ thứ 3 yêu cầu nạp 5 triệu, rồi 20 triệu để 'sửa lỗi cú pháp'. Khi nạp đến 85 triệu thì bị chặn liên lạc.",
          prevention: [
            "Không tin vào các lời mời chào việc làm nhàn hạ có thu nhập cao vô lý trên mạng xã hội.",
            "Không chuyển tiền tạm ứng, phí duy trì hay tiền cọc dưới bất kỳ hình thức nào.",
            "Kiểm tra tính pháp lý của doanh nghiệp tuyển dụng qua Cổng thông tin quốc gia.",
            "Không tải ứng dụng theo đường link lạ từ người không quen biết."
          ],
          actions: "Dừng ngay việc chuyển tiền! Không xóa tin nhắn hay lịch sử giao dịch. Chụp lại toàn bộ bằng chứng và gửi ngay báo cáo lên Công an xã Trà Liên.",
          isFeatured: true,
          isPublished: true,
          order: 1,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-2",
          title: "Lừa đảo giả danh Công an, Viện kiểm sát, Tòa án gọi điện đe dọa",
          category: "Mạo danh cơ quan công quyền",
          scamTypeId: "st-2",
          imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
          summary: "Đối tượng xưng là cán bộ điều tra thông báo người dân liên quan đến đường dây rửa tiền ma túy và yêu cầu chuyển tiền vào tài khoản an toàn để xác minh.",
          signs: [
            "Gọi điện thoại thông báo người dân liên quan đến vụ án hình sự, lệnh bắt giam khẩn cấp.",
            "Yêu cầu nạn nhân giữ bí mật, đến nơi vắng vẻ một mình không được cho người thân biết.",
            "Gửi hình ảnh lệnh bắt giữ, quyết định khởi tố có dấu đỏ giả mạo qua Zalo.",
            "Yêu cầu chuyển toàn bộ tiền tiết kiệm vào tài khoản ngân hàng do chúng chỉ định để 'chứng minh trong sạch'."
          ],
          examples: "Ông M. (thôn Thanh Trước) nhận cuộc gọi tự xưng Công an tỉnh thông báo số CMND của ông đang dùng để mở tài khoản rửa tiền 2 tỷ đồng tại TP.HCM. Kẻ mạo danh yêu cầu ông ra ngân hàng rút 70 triệu chuyển vào 'tài khoản kho bạc' để thanh tra.",
          prevention: [
            "Cơ quan Công an, Viện kiểm sát, Tòa án TUYỆT ĐỐI KHÔNG làm việc qua điện thoại, mạng xã hội.",
            "Mọi hoạt động điều tra, triệu tập đều có giấy triệu tập gửi trực tiếp qua Công an xã hoặc cảnh sát khu vực.",
            "Không có khái niệm 'tài khoản an toàn của cơ quan Công an' để người dân chuyển tiền chứng minh tài sản.",
            "Tuyệt đối không cung cấp mã OTP, số CCCD, tài khoản ngân hàng qua điện thoại."
          ],
          actions: "Cúp máy ngay lập tức! Đến ngay Trụ sở Công an xã Trà Liên hoặc gọi hotline 0235.3855.113 để được cán bộ hỗ trợ đối chứng trực tiếp.",
          isFeatured: true,
          isPublished: true,
          order: 2,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-3",
          title: "Lừa đảo giả mạo Ngân hàng, mã OTP và app VNeID giả mạo",
          category: "An ninh tài chính ngân hàng",
          scamTypeId: "st-3",
          imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80",
          summary: "Tin nhắn Brandname giả mạo thông báo tài khoản bị khóa, link cập nhật sinh trắc học hoặc phần mềm VNeID giả mạo nhằm chiếm đoạt tài khoản ngân hàng.",
          signs: [
            "Tin nhắn SMS hiển thị tên ngân hàng chứa đường link lạ (ví dụ: vietinbank-vn.com, vneid-dichvucong.top).",
            "Yêu cầu nhập tên đăng nhập, mật khẩu Internet Banking và mã xác thực OTP.",
            "Đối tượng gọi điện hướng dẫn cài app 'Bộ Công an' dạng đuôi tệp .apk để đồng bộ dữ liệu dân cư.",
            "Sau khi cài app, điện thoại bị tối đen màn hình hoặc tự động chuyển tiền liên tục."
          ],
          examples: "Anh T. (thôn Phương Đông) nhận cuộc gọi hỗ trợ đồng bộ CCCD lên mức 2 qua mạng. Kẻ gian gửi link tải app dịch vụ công giả. Khi cài xong, mã độc tự động chiếm quyền trợ năng, đọc mã OTP và rút sạch 45 triệu trong tài khoản.",
          prevention: [
            "Ngân hàng không bao giờ gửi đường link yêu cầu đăng nhập mật khẩu hay cung cấp mã OTP.",
            "Mã OTP là chìa khóa két sắt cá nhân - Không chia sẻ cho BẤT KỲ AI, kể cả nhân viên ngân hàng.",
            "Chỉ cài ứng dụng VNeID chính thức từ Google Play hoặc App Store, do Bộ Công an phát hành.",
            "Kích hoạt tính năng xác thực sinh trắc học (khuôn mặt) trên ứng dụng ngân hàng."
          ],
          actions: "Khóa thẻ và tài khoản ngân hàng khẩn cấp qua hotline ngân hàng hoặc ứng dụng! Gỡ ngay app lạ hoặc khôi phục cài đặt gốc điện thoại và báo ngay Công an xã.",
          isFeatured: true,
          isPublished: true,
          order: 3,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-4",
          title: "Lừa đảo qua Facebook/Zalo: Chiêu trò chiếm đoạt nick rồi vay tiền",
          category: "Mạng xã hội",
          scamTypeId: "st-4",
          imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80",
          summary: "Hack tài khoản mạng xã hội của người quen hoặc tạo nick sao chép thông tin cá nhân rồi nhắn tin mượn tiền gấp do gặp tai nạn.",
          signs: [
            "Tin nhắn hỏi vay tiền đột ngột từ bạn bè, người thân đã lâu không nói chuyện.",
            "Lý do cấp bách: người nhà đi viện, thanh toán tiền hàng bị kẹt mạng, đổi ngoại tệ.",
            "Số tài khoản thụ hưởng có tên người khác với lý do 'tài khoản của em đang lỗi/đây là tài khoản của bệnh viện'.",
            "Khi nạn nhân gọi video call thì chỉ hiện vài giây hình ảnh chập chờn rồi tắt máy báo 'mạng yếu'."
          ],
          examples: "Bà L. (thôn 1 Trà Nú) nhận tin nhắn từ tài khoản Facebook của con gái đang làm công nhân ở Bình Dương nhờ chuyển gấp 15 triệu để cọc phòng trọ. Do tin tưởng bà đã nhờ người chuyển tiền. Đến tối gọi lại cho con thì mới biết Facebook của con bị kẻ gian chiếm quyền.",
          prevention: [
            "Khi nhận được tin nhắn hỏi mượn tiền, chuyển tiền qua mạng xã hội, BẮT BUỘC gọi điện thoại trực tiếp bằng số điện thoại di động thông thường để xác nhận.",
            "Không tin vào các cuộc gọi video chỉ cử động miệng vài giây rồi ngắt.",
            "Cài đặt bảo mật 2 lớp (2FA) cho tất cả tài khoản Zalo, Facebook cá nhân."
          ],
          actions: "Cảnh báo ngay cho người thân và bạn bè biết tài khoản đó đã bị hack. Gửi thông tin số tài khoản kẻ gian đến Công an xã để phong tỏa ngăn chặn.",
          isFeatured: false,
          isPublished: true,
          order: 4,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-5",
          title: "Lừa đảo trúng thưởng, tặng quà tri ân khách hàng thân thiết",
          category: "Bán hàng & Quà tặng",
          scamTypeId: "st-5",
          imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80",
          summary: "Thông báo trúng thưởng xe máy SH, tivi, sổ tiết kiệm hàng trăm triệu đồng nhưng yêu cầu nộp 'phí vận chuyển', 'thuế thu nhập cá nhân' trước.",
          signs: [
            "Người dân không tham gia bất kỳ cuộc thi hay bốc thăm nào nhưng vẫn nhận được thông báo trúng thưởng lớn.",
            "Yêu cầu chuyển tiền trước bằng thẻ cào điện thoại hoặc chuyển khoản để làm hồ sơ nhận thưởng.",
            "Nhận được bưu kiện giao hàng quà tặng miễn phí kèm phiếu cào trúng thưởng 100% giải đặc biệt."
          ],
          examples: "Ông V. (thôn 1 Trà Kót) nhận được bưu kiện bưu điện tặng chảo chống dính. Bên trong có thẻ cào trúng thưởng xe Honda SH trị giá 85 triệu đồng. Kẻ gian gọi điện hướng dẫn ông nộp 8,5 triệu tiền thuế thu nhập để bàn giao xe tận nhà.",
          prevention: [
            "Không có phần thưởng nào 'từ trên trời rơi xuống' mà không cần đăng ký tham gia minh bạch.",
            "Các doanh nghiệp chân chính không bao giờ yêu cầu khách hàng nạp tiền qua tài khoản cá nhân để nhận giải.",
            "Từ chối nhận các kiện hàng lạ không do mình đặt mua."
          ],
          actions: "Không nộp tiền dưới mọi hình thức! Lưu lại số điện thoại kẻ lừa đảo và số bưu kiện để cung cấp cho cơ quan chức năng.",
          isFeatured: false,
          isPublished: true,
          order: 5,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-6",
          title: "Lừa đảo tuyển dụng, xuất khẩu lao động chui sang Campuchia, Myanmar",
          category: "Việc làm & Tuyển dụng",
          scamTypeId: "st-6",
          imageUrl: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&auto=format&fit=crop&q=80",
          summary: "Dụ dỗ thanh niên miền núi đi làm việc tại casino, trung tâm máy tính nước ngoài với mức lương 25 - 40 triệu nhưng thực chất bị bán vào các tổ chức tội phạm lừa đảo.",
          signs: [
            "Quảng cáo việc làm tại nước ngoài không cần tiếng, không cần tay nghề, được bao vé máy bay và làm thủ tục xuất cảnh.",
            "Đưa đón qua các đường mòn biên giới không có hộ chiếu hợp pháp.",
            "Thu phí môi giới hàng chục triệu đồng không có hợp đồng lao động chuẩn của Bộ Lao động - Thương binh & Xã hội."
          ],
          examples: "Hai thanh niên tại địa phương được bạn quen qua mạng hứa hẹn đưa sang làm quản lý game online tại Campuchia với mức lương 1.200 USD/tháng. Khi sang đến nơi bị tịch thu hộ chiếu, điện thoại và bị ép buộc gọi điện lừa đảo người Việt Nam 14 tiếng mỗi ngày.",
          prevention: [
            "Chỉ đi xuất khẩu lao động qua các công ty được Bộ LĐ-TB&XH cấp giấy phép hoạt động chính thức.",
            "Tìm hiểu kỹ thông tin về doanh nghiệp tại Phòng LĐ-TB&XH hoặc UBND xã Trà Liên.",
            "Cảnh giác cao với các lời mời xuất cảnh bằng đường tiểu ngạch."
          ],
          actions: "Báo ngay cho Công an xã Trà Liên khi phát hiện đối tượng lạ mặt về địa bàn lôi kéo, rủ rê thanh niên đi làm xa không rõ ràng.",
          isFeatured: true,
          isPublished: true,
          order: 6,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-7",
          title: "Lừa đảo đầu tư sàn ảo, tiền ảo, chứng khoán quốc tế siêu lợi nhuận",
          category: "Đầu tư tài chính",
          scamTypeId: "st-7",
          imageUrl: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
          summary: "Các 'chuyên gia tài chính' trên Telegram, Zalo khoe ảnh xe sang, tiền tỷ, mời gọi đầu tư sàn Forex, tiền số với cam kết lãi suất 20 - 30%/tháng.",
          signs: [
            "Cam kết lợi nhuận khủng, bảo hiểm 100% vốn, 'chỉ cần vào lệnh theo chuyên gia là thắng'.",
            "Ban đầu nạp ít cho rút lãi ngay để tạo lòng tin.",
            "Sau khi nạp số tiền lớn thì sàn báo lỗi hệ thống, yêu cầu nạp thêm phí mở khóa, thuế VAT để rút tiền rồi sập sàn."
          ],
          examples: "Anh K. (thôn Định Yên) tham gia nhóm 'Đầu tư sinh lời Trà Bồng'. Sau khi nạp 10 triệu thì tài khoản app báo tăng lên 25 triệu. Anh tiếp tục vay mượn nạp thêm 200 triệu. Khi muốn rút vốn thì hệ thống đòi nạp tiếp 60 triệu phí xác minh danh tính.",
          prevention: [
            "Pháp luật Việt Nam không công nhận và không bảo hộ các sàn giao dịch tiền ảo, Forex quốc tế.",
            "Không có kênh đầu tư hợp pháp nào cam kết lợi nhuận gấp nhiều lần lãi suất ngân hàng mà không có rủi ro.",
            "Không tham gia vào các hội đồng đầu tư tài chính kín trên mạng xã hội."
          ],
          actions: "Tuyệt đối không nạp thêm bất kỳ khoản tiền nào để 'rút tiền cũ'. Lưu lại website, tên miền và sao kê tài khoản ngân hàng chuyển tiền để báo cơ quan Công an.",
          isFeatured: false,
          isPublished: true,
          order: 7,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-8",
          title: "Lừa đảo mua bán online, bẫy cọc và thủ đoạn shipper giả",
          category: "Thương mại điện tử",
          scamTypeId: "st-8",
          imageUrl: "https://images.unsplash.com/photo-1556742049-0a67e5572293?w=800&auto=format&fit=crop&q=80",
          summary: "Quảng cáo bán nông sản, điện máy, xe máy giá rẻ bất ngờ yêu cầu đặt cọc trước, hoặc shipper gọi điện thông báo có hàng COD nhưng giao hàng rác.",
          signs: [
            "Giá sản phẩm chỉ bằng 30-50% giá thị trường với lý do 'xả kho', 'thu hồi vốn'.",
            "Bắt buộc chuyển cọc trước 30-50% qua tài khoản cá nhân.",
            "Đối tượng gọi điện bảo gửi kiện hàng tới nhà lúc gia chủ đi vắng và nhờ người nhà chuyển khoản thanh toán hộ."
          ],
          examples: "Chị P. mua một chiếc máy cắt cỏ qua Facebook với giá 1,2 triệu (giá thị trường 3 triệu). Người bán yêu cầu cọc 500.000đ. Sau khi chuyển cọc thì tài khoản của người bán biến mất hoàn toàn.",
          prevention: [
            "Chỉ mua hàng trên các sàn TMĐT uy tín (Shopee, Lazada, Tiki) có chính sách đồng kiểm và bảo vệ người mua.",
            "Khi nhận hàng COD, phải kiểm tra hàng trước khi thanh toán. Nhắc nhở người nhà không chuyển tiền hộ hàng hóa nếu chưa xác nhận trực tiếp.",
            "Không chuyển tiền đặt cọc cho các trang mạng không có địa chỉ kinh doanh rõ ràng."
          ],
          actions: "Lưu giữ biên lai chuyển khoản, số điện thoại người bán để đối chiếu và báo cáo.",
          isFeatured: false,
          isPublished: true,
          order: 8,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-9",
          title: "Lừa đảo vay tiền online qua app đen, bẫy giải ngân ảo",
          category: "Tín dụng đen",
          scamTypeId: "st-9",
          imageUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80",
          summary: "Quảng cáo vay tiền nhanh không cần thế chấp, giải ngân trong 5 phút. Khi vay xong đối tượng báo nhập sai số tài khoản và đòi nộp tiền sửa lỗi.",
          signs: [
            "Thủ tục vay quá dễ dàng, chỉ cần chụp CCCD không cần chứng minh thu nhập.",
            "Sau khi hoàn tất hồ sơ, app hiển thị tiền đã giải ngân nhưng bị 'đóng băng do sai số tài khoản'.",
            "Yêu cầu nạn nhân nộp 20 - 50% khoản vay để 'bảo hiểm khoản vay' hoặc sửa thông tin số tài khoản.",
            "Lãi suất thực tế lên tới 500 - 1000%/năm nếu lỡ vay phải app tín dụng đen."
          ],
          examples: "Anh N. cần vay 30 triệu làm mùa vụ keo. Cài app vay vốn trên mạng, app báo đã duyệt nhưng số tài khoản bị sai một số cuối. Đối tượng tự xưng nhân viên tài chính yêu cầu anh nộp 6 triệu để sửa lỗi hệ thống, nếu không nộp sẽ bị kiện ra tòa vì hành vi lừa đảo.",
          prevention: [
            "Khi cần vốn sản xuất kinh doanh, người dân hãy liên hệ Ngân hàng Chính sách Xã hội hoặc Ngân hàng Nông nghiệp (Agribank) trên địa bàn.",
            "Không bao giờ có chuyện người đi vay phải đóng tiền trước để nhận tiền giải ngân.",
            "Không tải các ứng dụng cho vay trôi nổi trên mạng internet."
          ],
          actions: "Không nộp bất kỳ khoản tiền nào cho đối tượng! Nếu bị đe dọa đòi nợ khủng bố danh bạ, hãy báo ngay cho Công an xã Trà Liên.",
          isFeatured: false,
          isPublished: true,
          order: 9,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-10",
          title: "Lừa đảo giả danh người thân ở nước ngoài gửi quà, tiền cứu trợ",
          category: "Mạo danh cá nhân",
          scamTypeId: "st-10",
          imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80",
          summary: "Làm quen qua mạng tự xưng là quân nhân, kỹ sư nước ngoài hoặc người thân gửi kiện hàng triệu đô về Việt Nam, sau đó yêu cầu đóng thuế hải quan.",
          signs: [
            "Người lạ kết bạn nói chuyện thân mật, hứa hẹn tặng quà đắt tiền hoặc gửi ngoại tệ về làm từ thiện.",
            "Có người tự xưng là nhân viên hải quan sân bay hoặc bưu điện gọi thông báo kiện hàng bị giữ do có nhiều ngoại tệ.",
            "Yêu cầu đóng phí lót tay, tiền phạt thuế hải quan hàng chục đến hàng trăm triệu đồng."
          ],
          examples: "Bà D. (thôn 2 Trà Nú) được một người xưng là sĩ quan nước ngoài quen qua Facebook hứa gửi thùng quà có 500.000 USD để cùng bà làm từ thiện. Vài ngày sau, một phụ nữ tự xưng hải quan Tân Sơn Nhất gọi yêu cầu bà đóng 35 triệu tiền phạt qua tài khoản cá nhân.",
          prevention: [
            "Cơ quan Hải quan không bao giờ làm việc qua điện thoại cá nhân và không yêu cầu nộp tiền thuế vào tài khoản cá nhân.",
            "Hết sức tỉnh táo trước các lời hứa hẹn gửi tiền, gửi quà xa lạ từ nước ngoài.",
            "Không tiếp chuyện với các đối tượng lạ kết bạn trên mạng xã hội."
          ],
          actions: "Dừng mọi liên lạc, không đóng bất kỳ khoản phí nào và thông báo ngay cho người thân và Công an xã.",
          isFeatured: false,
          isPublished: true,
          order: 10,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-11",
          title: "Lừa đảo quét mã QR độc hại và thủ đoạn dán đè mã QR thanh toán",
          category: "Công nghệ số",
          scamTypeId: "st-11",
          imageUrl: "https://images.unsplash.com/photo-1595079672139-545c600f576e?w=800&auto=format&fit=crop&q=80",
          summary: "Kẻ gian dán đè mã QR nhận tiền tại các quầy hàng tạp hóa hoặc gửi mã QR dẫn đến trang web giả mạo đánh cắp tài khoản ngân hàng.",
          signs: [
            "Mã QR tại quầy thanh toán có dấu hiệu bị bong tróc, dán đè một lớp mã QR khác lên trên.",
            "Quét mã QR nhưng không ra thông tin chuyển khoản mà chuyển hướng đến một trang web lạ đòi mật khẩu.",
            "Nhận được hình ảnh mã QR qua tin nhắn Zalo kèm lời dụ quét để nhận voucher khuyến mãi."
          ],
          examples: "Một quán tạp hóa tại trung tâm xã bị kẻ gian lén dán đè mã QR tài khoản khác lên bảng mica để bàn. Tiền thanh toán của hơn 10 khách hàng trong buổi sáng đều chảy vào túi kẻ gian mà chủ quán không hay biết.",
          prevention: [
            "Chủ cơ sở kinh doanh thường xuyên kiểm tra mã QR tại cửa hàng, bật thông báo loa phát âm thanh khi có tiền về tài khoản.",
            "Người dân trước khi xác nhận chuyển tiền phải kiểm tra kỹ Tên chủ tài khoản thụ hưởng hiển thị trên app ngân hàng.",
            "Cẩn trọng trước khi quét bất kỳ mã QR lạ nào được gửi qua tin nhắn."
          ],
          actions: "Nếu phát hiện mã QR dán đè, lập tức bóc gỡ, kiểm tra camera an ninh và báo cho cơ quan Công an.",
          isFeatured: false,
          isPublished: true,
          order: 11,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-12",
          title: "Lừa đảo Deepfake: Dùng trí tuệ nhân tạo (AI) giả mạo khuôn mặt, giọng nói",
          category: "Công nghệ cao",
          scamTypeId: "st-12",
          imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
          summary: "Sử dụng công nghệ AI cắt ghép khuôn mặt và giọng nói của người thân để gọi video call mượn tiền, đánh lừa thị giác của nạn nhân.",
          signs: [
            "Cuộc gọi video call hình ảnh người thân cử động cứng nhắc, mắt chớp không tự nhiên, màu da nhợt nhạt.",
            "Âm thanh có độ trễ, giọng nói đứt quãng hoặc giống như máy đọc.",
            "Cuộc gọi thường diễn ra rất ngắn, chỉ vài giây là cúp máy với lý do 'đang ở chỗ sóng yếu' rồi chuyển sang nhắn tin mượn tiền.",
            "Số tài khoản nhận tiền không mang tên người thân đó."
          ],
          examples: "Chị S. nhận được cuộc gọi video từ Zalo của cháu trai. Nhìn thấy mặt cháu đúng thật nhưng hình hơi mờ, cháu nói đang cấp cứu bạn tai nạn xe và nhờ chuyển gấp 10 triệu. Chị S. chuyển tiền xong gọi lại cho mẹ cháu mới phát hiện là cháu không hề bị tai nạn.",
          prevention: [
            "Khi có cuộc gọi video mượn tiền đáng ngờ, hãy yêu cầu người đó làm các động tác khó: quay ngang mặt, giơ tay lên che mặt, hoặc hỏi một kỷ niệm riêng tư chỉ 2 người biết.",
            "Luôn gọi lại bằng cuộc gọi thoại thông thường (qua mạng viễn thông) tới số điện thoại chính thức của người thân.",
            "Tuyệt đối không chuyển tiền vào tài khoản lạ không trùng tên người thân."
          ],
          actions: "Báo ngay cho ngân hàng để yêu cầu tra soát giao dịch khẩn cấp và gửi thông tin đến Công an xã Trà Liên.",
          isFeatured: true,
          isPublished: true,
          order: 12,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-13",
          title: "Lừa đảo nhắm vào người cao tuổi: Bán thuốc giả, dụ dỗ rút tiền tiết kiệm",
          category: "Bảo vệ người cao tuổi",
          scamTypeId: "st-13",
          imageUrl: "https://images.unsplash.com/photo-1516307365426-bea591f05011?w=800&auto=format&fit=crop&q=80",
          summary: "Các nhóm đối tượng đến vùng nông thôn tiếp cận người già neo đơn, mượn danh hội thảo chăm sóc sức khỏe để bán thuốc thần dược rởm với giá trên trời.",
          signs: [
            "Mời tham gia hội thảo miễn phí, tặng quà nhỏ (dầu gió, thau chậu, mì tôm) để dụ dỗ người già.",
            "Tung tin đe dọa các loại bệnh hiểm nghèo và quảng cáo các loại thuốc nam gia truyền, máy lọc ion chữa bách bệnh.",
            "Dụ dỗ người già mang sổ tiết kiệm hoặc vàng tích lũy ra đổi lấy bảo hiểm sức khỏe giả."
          ],
          examples: "Cụ bà B. (thôn Định Yên) được một nhóm tự xưng 'Bác sĩ Viện y học cổ truyền' đến khám bệnh tại nhà. Họ phán cụ bị ung thư xương giai đoạn đầu và bán cho cụ 4 hộp thuốc bột không nhãn mác với giá 18 triệu đồng.",
          prevention: [
            "Con cháu trong gia đình cần thường xuyên trò chuyện, cảnh báo thủ đoạn lừa đảo cho ông bà, cha mẹ cao tuổi.",
            "Khi có vấn đề sức khỏe, người dân cần đến Trạm Y tế xã Trà Liên hoặc Trung tâm Y tế huyện để được bác sĩ khám và kê đơn.",
            "Không mua thuốc, thực phẩm chức năng qua người lạ đến tận nhà tiếp thị."
          ],
          actions: "Người dân phát hiện các nhóm người lạ tụ tập bán hàng rong có dấu hiệu lừa đảo, báo ngay Công an xã Trà Liên để kiểm tra, ngăn chặn.",
          isFeatured: false,
          isPublished: true,
          order: 13,
          createdAt: new Date().toISOString()
        },
        {
          id: "hb-14",
          title: "Lừa đảo nhắm vào học sinh: Nạp thẻ game giả, mua bán nick và bẫy việc làm",
          category: "An toàn học đường",
          scamTypeId: "st-14",
          imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
          summary: "Các đối tượng lợi dụng sự ngây thơ của học sinh để lừa nạp thẻ cào trúng kim cương, acc game VIP hoặc lừa tham gia các thử thách độc hại trên mạng.",
          signs: [
            "Các trang web quảng cáo 'Nạp 20k nhận 10.000 quân huy, kim cương Free Fire'.",
            "Mời gọi học sinh làm cộng tác viên gõ mã captcha hoặc làm bài tập online với thù lao hấp dẫn.",
            "Yêu cầu học sinh cung cấp số điện thoại của bố mẹ hoặc chụp ảnh thẻ ngân hàng của phụ huynh."
          ],
          examples: "Em K. (học sinh trường số 2 xã Trà Liên) muốn mua nick game đã dùng số tiền tiết kiệm 300.000đ mua thẻ nạp cho một đối tượng trên mạng. Sau khi gửi mã thẻ, đối tượng tiếp tục dọa nếu không chụp thẻ ngân hàng của bố gửi thì sẽ hack tài khoản Facebook của cả nhà.",
          prevention: [
            "Học sinh tuyệt đối không nạp thẻ vào các trang web không rõ nguồn gốc.",
            "Không chụp ảnh giấy tờ tùy thân, thẻ ATM của bố mẹ gửi cho bất kỳ ai trên mạng.",
            "Khi bị người lạ trên mạng đe dọa, hãy dũng cảm kể ngay với thầy cô giáo, bố mẹ hoặc cán bộ Công an xã, không được giấu một mình."
          ],
          actions: "Báo ngay cho ban giám hiệu nhà trường và Công an xã để kịp thời xử lý, bảo vệ tâm lý học sinh.",
          isFeatured: true,
          isPublished: true,
          order: 14,
          createdAt: new Date().toISOString()
        }
      ];
      modified = true;
    }

    // 6. Seed Urgent Alerts
    if (!this.data.alerts || this.data.alerts.length === 0) {
      this.data.alerts = [
        {
          id: "alt-1",
          title: "CẢNH BÁO KHẨN CẤP: Xuất hiện cuộc gọi giả danh Công an huyện đe dọa người dân trên địa bàn xã",
          content: "Trong 3 ngày qua, Công an xã Trà Liên tiếp nhận phản ánh của một số bà con tại Thôn Định Yên và Thôn Phương Đông về việc nhận cuộc gọi từ đầu số +84 xưng là cán bộ điều tra Công an huyện yêu cầu chuyển tiền. Công an xã khẳng định đây là hành vi lừa đảo 100%! Bà con tuyệt đối không làm theo, cúp máy ngay và gọi 0235.3855.113.",
          imageUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80",
          severity: "EMERGENCY", // RED
          villageId: "v-1",
          schoolId: null,
          targetAudience: "Toàn thể nhân dân trên địa bàn xã Trà Liên",
          isPublished: true,
          isPinned: true,
          startDate: new Date(Date.now() - 86400000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 14).toISOString(),
          createdAt: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: "alt-2",
          title: "CẢNH BÁO CAO: Chiêu trò hack Facebook mượn tiền nhắm vào các hộ có người thân đi làm ăn xa",
          content: "Đề nghị bà con thôn 1 Trà Nú và thôn 2 Trà Nú chú ý: Nhiều đối tượng đang lợi dụng công nghệ sao chép hình ảnh tài khoản mạng xã hội của thanh niên đi làm ăn tại TP.HCM, Bình Dương để nhắn tin vay tiền người nhà ở quê. Hãy gọi điện trực tiếp xác minh trước khi gửi tiền!",
          imageUrl: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80",
          severity: "HIGH", // ORANGE
          villageId: "v-4",
          schoolId: null,
          targetAudience: "Các hộ gia đình có con em đi làm ăn xa",
          isPublished: true,
          isPinned: true,
          startDate: new Date(Date.now() - 172800000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 20).toISOString(),
          createdAt: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: "alt-3",
          title: "CẢNH BÁO HỌC ĐƯỜNG: Bẫy tuyển dụng làm nhiệm vụ online nhắm vào học sinh THCS",
          content: "Công an xã Trà Liên phối hợp Ban Giám hiệu Trường học số 2 xã Trà Liên thông báo: Hiện có hiện tượng lôi kéo học sinh tham gia các nhóm Telegram làm nhiệm vụ nạp thẻ cào kiếm tiền tiêu vặt. Phụ huynh và học sinh cần đề cao cảnh giác!",
          imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
          severity: "MEDIUM", // YELLOW
          villageId: null,
          schoolId: "s-2",
          targetAudience: "Học sinh và phụ huynh học sinh",
          isPublished: true,
          isPinned: false,
          startDate: new Date(Date.now() - 259200000).toISOString(),
          endDate: new Date(Date.now() + 86400000 * 30).toISOString(),
          createdAt: new Date(Date.now() - 259200000).toISOString()
        },
        {
          id: "alt-4",
          title: "THÔNG TIN TUYÊN TRUYỀN: Hướng dẫn cài đặt ứng dụng VNeID và cảnh giác phần mềm giả mạo",
          content: "Bộ Công an chỉ phát hành duy nhất ứng dụng VNeID trên kho ứng dụng Google Play và Apple App Store. Người dân không cài đặt ứng dụng từ các đường link lạ đuôi .apk do người tự xưng là cán bộ Công an gửi qua Zalo.",
          imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&auto=format&fit=crop&q=80",
          severity: "INFO", // BLUE
          villageId: null,
          schoolId: null,
          targetAudience: "Toàn thể người dân sử dụng điện thoại thông minh",
          isPublished: true,
          isPinned: false,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 60).toISOString(),
          createdAt: new Date().toISOString()
        }
      ];
      modified = true;
    }

    // 7. Seed Sample Reports for demonstration & analytics
    if (!this.data.reports || this.data.reports.length === 0) {
      this.data.reports = [
        {
          id: "rep-1",
          reportCode: "TL-2026-00001",
          fullName: "Lê Văn Thành",
          phone: "0912345xxx",
          villageId: "v-1",
          schoolId: null,
          scamTypeId: "st-2",
          incidentTime: "2026-09-20 09:30",
          amount: 50000000,
          description: "Nhận được cuộc gọi từ số 0981.234.xxx xưng là Đại úy Hoàng thuộc cơ quan điều tra yêu cầu chuyển 50 triệu vào tài khoản tạm giữ do liên quan đến buôn ma túy. Tôi đã nghi ngờ và chưa chuyển tiền.",
          suspiciousContact: "0981.234.xxx - Tài khoản Techcombank: 1903xxx",
          contactMethod: "Điện thoại",
          evidenceFiles: [],
          severity: "SUSPECTED",
          status: "RESOLVED",
          assignedTo: "u-officer1",
          adminNote: "Đã cử đồng chí Trí liên hệ trực tiếp gia đình anh Thành xác minh. Khẳng định là số lừa đảo. Hướng dẫn anh chặn số và tuyên truyền cho hàng xóm.",
          createdAt: "2026-09-20T02:45:00.000Z",
          updatedAt: "2026-09-21T08:15:00.000Z"
        },
        {
          id: "rep-2",
          reportCode: "TL-2026-00002",
          fullName: "Nguyễn Thị Mai",
          phone: "0905678xxx",
          villageId: "v-2",
          schoolId: null,
          scamTypeId: "st-4",
          incidentTime: "2026-09-22 14:15",
          amount: 15000000,
          description: "Nick Facebook của em gái tên Nguyễn Thị Lan nhắn mượn 15 triệu để nộp viện phí cho bạn. Đã chuyển tiền vào tài khoản tên NGUYEN VAN HIEU tại MBBank. Sau đó gọi điện lại thì em gái bảo bị mất nick.",
          suspiciousContact: "Facebook: Lan Nguyen (đã bị chiếm quyền) - STK: MB 0398xxx",
          contactMethod: "Facebook",
          evidenceFiles: [],
          severity: "SCAMMED",
          status: "IN_PROGRESS",
          assignedTo: "u-officer1",
          adminNote: "Đã lập hồ sơ thụ lý ban đầu, sao kê ủy nhiệm chi, phối hợp Đội CSHS Công an huyện gửi văn bản đề nghị ngân hàng phong tỏa tài khoản thụ hưởng.",
          createdAt: "2026-09-22T08:30:00.000Z",
          updatedAt: "2026-09-23T10:00:00.000Z"
        },
        {
          id: "rep-3",
          reportCode: "TL-2026-00003",
          fullName: "Đinh Văn Rơi",
          phone: "0988776xxx",
          villageId: "v-4",
          schoolId: null,
          scamTypeId: "st-1",
          incidentTime: "2026-09-25 10:00",
          amount: 5000000,
          description: "Được hướng dẫn cài app 'Nhiệm vụ Shopee 4.0' trên Telegram để giật đơn kiếm hoa hồng. Đã nạp 5 triệu và hiện tại ứng dụng bắt nạp thêm 20 triệu mới cho rút.",
          suspiciousContact: "Nhóm Telegram: Shopee Mall VIP - STK: BIDV 4501xxx",
          contactMethod: "Zalo",
          evidenceFiles: [],
          severity: "RISK",
          status: "VERIFYING",
          assignedTo: "u-officer2",
          adminNote: "Đồng chí Cẩm đã gọi điện khuyên can nạn nhân tuyệt đối KHÔNG nạp thêm tiền. Đang hướng dẫn trích xuất tin nhắn phục vụ điều tra.",
          createdAt: "2026-09-25T04:10:00.000Z",
          updatedAt: "2026-09-25T07:20:00.000Z"
        },
        {
          id: "rep-4",
          reportCode: "TL-2026-00004",
          fullName: "Trần Thị Bé",
          phone: "0934112xxx",
          villageId: null,
          schoolId: "s-2",
          scamTypeId: "st-14",
          incidentTime: "2026-09-26 16:30",
          amount: 300000,
          description: "Con trai học lớp 8 bị một người trên mạng đe dọa nếu không mua 300k thẻ cào thì sẽ bị hack tài khoản của cả lớp. Cháu sợ quá đã lấy tiền tiết kiệm mua thẻ gửi cho chúng.",
          suspiciousContact: "Zalo ẩn danh 'Admin Free Fire'",
          contactMethod: "Zalo",
          severity: "EMERGENCY",
          status: "NEW",
          assignedTo: null,
          adminNote: "Báo cáo mới tiếp nhận, cần phân công cán bộ phụ trách trường học xuống làm việc hỗ trợ tâm lý em học sinh.",
          createdAt: "2026-09-26T10:00:00.000Z",
          updatedAt: "2026-09-26T10:00:00.000Z"
        },
        {
          id: "rep-5",
          reportCode: "TL-2026-00005",
          fullName: "Hồ Văn Nú",
          phone: "0977889xxx",
          villageId: "v-5",
          schoolId: null,
          scamTypeId: "st-7",
          incidentTime: "2026-09-27 11:00",
          amount: 0,
          description: "Có người xưng là công ty chứng khoán quốc tế liên tục gọi mời vào nhóm đầu tư sinh lời 30%/tháng. Nghi ngờ lừa đảo nên báo cáo để bà con trong thôn cùng cảnh giác.",
          suspiciousContact: "028.7779.xxxx",
          contactMethod: "Điện thoại",
          evidenceFiles: [],
          severity: "SUSPECTED",
          status: "RESOLVED",
          assignedTo: "u-officer2",
          adminNote: "Đã ghi nhận thông tin, phát thanh trên cụm loa truyền thanh thôn 2 Trà Nú để cảnh giác bà con.",
          createdAt: "2026-09-27T04:30:00.000Z",
          updatedAt: "2026-09-27T08:00:00.000Z"
        }
      ];
      modified = true;
    }

    // 8. Seed Sample Report Logs
    if (!this.data.reportLogs || this.data.reportLogs.length === 0) {
      this.data.reportLogs = [
        {
          id: "rl-1",
          reportId: "rep-1",
          userId: "u-admin",
          userName: "Đại úy Nguyễn Văn Hùng",
          oldStatus: "NEW",
          newStatus: "VERIFYING",
          note: "Tiếp nhận hồ sơ từ người dân, phân công đồng chí Trí xác minh.",
          createdAt: "2026-09-20T03:00:00.000Z"
        },
        {
          id: "rl-2",
          reportId: "rep-1",
          userId: "u-officer1",
          userName: "Thượng úy Trần Minh Trí",
          oldStatus: "VERIFYING",
          newStatus: "RESOLVED",
          note: "Đã tư vấn, hỗ trợ ngăn chặn kịp thời vụ lừa đảo giả danh Công an. Gia đình không thiệt hại tài sản.",
          createdAt: "2026-09-21T08:15:00.000Z"
        },
        {
          id: "rl-3",
          reportId: "rep-2",
          userId: "u-officer1",
          userName: "Thượng úy Trần Minh Trí",
          oldStatus: "NEW",
          newStatus: "IN_PROGRESS",
          note: "Đã hướng dẫn bị hại làm đơn tố giác, hoàn thiện hồ sơ ban đầu chuyển Cơ quan CSĐT Công an huyện.",
          createdAt: "2026-09-23T10:00:00.000Z"
        }
      ];
      modified = true;
    }

    if (modified) {
      this.save();
      console.log("Database initialized with seed data successfully.");
    }
  }

  // Generic Query Helpers
  find(collection, filterFn = null) {
    const list = this.data[collection] || [];
    if (!filterFn) return [...list];
    return list.filter(filterFn);
  }

  findOne(collection, filterFn) {
    const list = this.data[collection] || [];
    return list.find(filterFn) || null;
  }

  create(collection, item) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    this.data[collection].unshift(item);
    this.save();
    return item;
  }

  update(collection, id, updates) {
    const list = this.data[collection] || [];
    const index = list.findIndex(x => x.id === id);
    if (index === -1) return null;
    this.data[collection][index] = {
      ...this.data[collection][index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data[collection][index];
  }

  delete(collection, id) {
    const list = this.data[collection] || [];
    const index = list.findIndex(x => x.id === id);
    if (index === -1) return false;
    this.data[collection].splice(index, 1);
    this.save();
    return true;
  }

  getSettings() {
    return { ...this.data.settings };
  }

  updateSettings(newSettings) {
    this.data.settings = {
      ...this.data.settings,
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.data.settings;
  }

  // Generate next report code like TL-2026-00006
  getNextReportCode() {
    const year = new Date().getFullYear();
    const reports = this.data.reports || [];
    const prefix = `TL-${year}-`;
    let maxSeq = 0;
    for (const r of reports) {
      if (r.reportCode && r.reportCode.startsWith(prefix)) {
        const parts = r.reportCode.split('-');
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
    const nextSeq = String(maxSeq + 1).padStart(5, '0');
    return `${prefix}${nextSeq}`;
  }
}

module.exports = new Database();
