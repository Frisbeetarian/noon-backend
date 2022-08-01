"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserSubscriber = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const Profile_1 = require("../entities/Profile");
let UserSubscriber = class UserSubscriber {
    listenTo() {
        return User_1.User;
    }
    async afterInsert(event) {
        const profile = await typeorm_1.getConnection()
            .createQueryBuilder()
            .insert()
            .into(Profile_1.Profile)
            .values({
            username: event.entity.username,
        })
            .returning('*')
            .execute();
        const user = await User_1.User.findOne(event.entity.id);
        user === null || user === void 0 ? void 0 : user.profile = profile.raw[0];
        await typeorm_1.getConnection().manager.save(user);
    }
};
UserSubscriber = __decorate([
    typeorm_1.EventSubscriber()
], UserSubscriber);
exports.UserSubscriber = UserSubscriber;
//# sourceMappingURL=UserSubscriber.js.map